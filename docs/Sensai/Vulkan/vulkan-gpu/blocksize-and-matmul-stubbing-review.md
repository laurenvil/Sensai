# Review: BLOCK_SIZE Reduction and Matmul Stubbing in Vulkan Lite

**Date:** 2026-05-10
**Branch:** `sensai-gpu-vulkan-v2`
**Subject:** Was reducing `BLOCK_SIZE 512 → 32` the right approach? Should we undo the matmul stubbing? How do we avoid the cc1plus OOM without compromising the GPU path?

---

## Context

The patched llama.cpp Vulkan source tree lives at `vulkan-build-source/` (b9049 tag). Two categories of edits were applied:

1. Workgroup-size reduction across **81 shader files** (`*.comp`).
2. Stubbing of `mul_mm` / `mul_mmq` / `coopmat*` matmul shaders to fit the build in 4 GB RAM, plus a runtime guard in `ggml-vulkan.cpp` that routes any matmul with RHS columns > 1 to CPU.

The build has not produced a working binary on-target. This document reviews whether the approach was correct and what to change.

---

## Q1: Is `BLOCK_SIZE` a single tunable knob? Was the approach right?

### Finding: there is no single knob

The shaders fall into three categories:

| Pattern | Tunable from host code? | Examples | Count of barrier-using shaders |
|---|---|---|---|
| `layout(constant_id = N) const uint BLOCK_SIZE = …` | **Yes — Vulkan specialization constant** | `soft_max.comp`, `mul_mm_cm2.comp` | a few |
| `#define BLOCK_SIZE 512` (compile-time) | No — must edit GLSL | `norm.comp`, `rms_norm.comp` | a few |
| `layout(local_size_x = 512, …)` (literal) | No — must edit GLSL | most element-wise / dequant shaders | most |

A grep of the 153 `.comp` files shows only **43 contain a `barrier()` call** — those are the only shaders where the wave-concurrency wall actually applies. Yet the patch edited **81 shaders**. The `add.comp` change is correct (it has barriers), but `abs.comp`, `ceil.comp`, `clamp.comp`, `copy.comp`, `cos.comp`, all the `dequant_*.comp`, etc. **don't have barriers** — for those, `local_size_x = 512` was fine, and shrinking to 32 just multiplies dispatch overhead 16×.

The host-code patch in `ggml-vulkan.cpp` already does the right thing for `soft_max` and `im2col_3d` — passes `32u` as a specialization constant when `maxComputeSharedMemorySize <= 16384`. That is the surgical pattern.

### Cleaner alternative for `norm.comp` / `rms_norm.comp`

Instead of editing the shader source, do the same refactor that `soft_max.comp` already received upstream: convert

```glsl
#define BLOCK_SIZE 512
```

to

```glsl
layout(constant_id = X) const uint BLOCK_SIZE = 512;
layout(local_size_x_id = X, local_size_y = 1, local_size_z = 1) in;
```

and pass `32` from `ggml-vulkan.cpp` only on the Adreno 702 path. One source of truth, no fork from upstream for non-Adreno builds, easy to revert per-device.

### Verdict on the BLOCK_SIZE work

- **Direction is right** for the ~10 shaders that have barriers (32 = 1 wave on A702).
- **The other ~70 shader edits are unnecessary** and probably a small perf regression (more dispatches).
- **Convert to spec constant** beats editing GLSL for the two normalization shaders.

Cleanup recommendation: revert the ~70 barrier-free element-wise shader edits; refactor `norm.comp` and `rms_norm.comp` to specialization constants; keep the host-code overrides for soft_max and im2col_3d.

---

## Q2: The matmul stubbing — undo it?

### What the patch actually does

Looking at the actual `ggml-vulkan.cpp` patch, the stubbing has two enforcement points:

1. **Build-time:** `vulkan-shaders-gen.cpp` emits 0-byte SPIR-V for `mul_mm` / `mul_mmq` / `coopmat*` → the source file shrinks 86 MB → 36 bytes → cc1plus no longer OOMs. A complementary patch in `ggml_vk_create_pipeline_func` skips pipeline creation when `spv_size == 0`.
2. **Runtime:** in `supports_op` for `GGML_OP_MUL_MAT`:
   ```cpp
   if (op->src[1]->ne[1] > 1) return false;
   ```
   This is much broader than "fall back if shared mem is too tight." It says: **any matmul whose RHS has more than one column → CPU**. That means:
   - Prefill (batch ≥ 32 tokens) → CPU
   - Speculative decoding → CPU
   - `--parallel 2+` (concurrent users) → CPU even for generation
   - Only single-token greedy generation runs on GPU (mat-vec)

### Why the eval numbers look the way they do

This explains `vulkan-eval-v1.md` cleanly: prefill measured 1.0 t/s isn't "CPU prefill" (CPU alone hits 8.1 t/s) — it's "ping-pong every layer's QKV/FFN tensor back to CPU and home again," which is worse than either pure path. And mat-vec on a single-CU Adreno 702 with shared system memory has no real bandwidth advantage over CPU.

### Recommendation: undo the stubbing

The runtime guard cripples exactly the workload (mat-mat) where GPUs are supposed to win, and it bakes in a hard ceiling that no amount of BLOCK_SIZE tuning can lift. Remove the `op->src[1]->ne[1] > 1 → false` line and re-enable real `mul_mm` shaders.

### Build-without-OOM options, ranked

| Approach | Pros | Cons |
|---|---|---|
| **A. Cross-compile from a desktop** (x86 or aarch64 with 16+ GB RAM), `scp` binary to Uno Q | Standard embedded workflow. Eliminates 2 GB cc1plus problem entirely. No source compromises. Mesa Turnip on the board runs any aarch64 ELF you hand it. | Need a build host; need to match glibc/Mesa/Vulkan loader ABI (Trixie ↔ Trixie is straightforward). |
| **B. Trim shader-gen permutations, not stub them** — patch `vulkan-shaders-gen.cpp` to emit only the `(quant_type × dst_type × matmul_id × align)` combinations Sensai actually uses (Q4_0, Q6_K, F32 attention) | Keeps real GPU mat-mat. File goes from 86 MB to ~10 MB → buildable on 4 GB. Honest perf comparison. | Manual list of needed variants; needs care if you swap models. |
| **C. zram swap for the build** (`modprobe zram` → mkswap → swapon → build → swapoff) | Trivial; no source changes. cc1plus pages compress well. | Slow; wears flash if backed by storage; only buys headroom, doesn't fix the root cause. |
| **D. Per-TU compile flags** (`-O0 -fno-var-tracking-assignments` on `mul_mm.comp.cpp` only) via CMake `target_compile_options` | Source untouched; quick experiment. | Fragile; the 86 MB static-array footprint comes from data, not code, so `-O0` only saves the optimizer — may still OOM. |
| **E. `BUILD_SHARED_LIBS=ON` + a streaming linker** (mold or lld) | Lower peak link memory. | Whitepaper says shared-libs build already failed; the matmul TU itself is the OOM site, not the link step. |

### Recommended path forward

1. **Build host:** option A first (cleanest), option B as a fallback if a build host isn't convenient.
2. **Delete** the runtime `ne[1] > 1 → CPU` guard in `supports_op`.
3. **Keep** the IQ1 graceful-disable, the FA disable on 16 KB devices, and the s_warptile forcing — those are correct defensive patches that don't compromise the workload.
4. **Revert** the ~70 barrier-free element-wise shader edits.
5. **Refactor** `norm.comp` / `rms_norm.comp` to specialization constants (or, as a stopgap, keep the in-place 512→32 GLSL edit).

The resulting fork is much smaller, much closer to upstream, and lets us actually measure whether Adreno 702 mat-mat is competitive — instead of measuring CPU through a Vulkan trampoline.

---

## Summary

| Patch | Keep? | Notes |
|---|---|---|
| `s_warptile` forcing on `maxComputeSharedMemorySize <= 16384` | ✅ Keep | Correct shared-memory fit |
| IQ1 graceful disable (`mul_mat_* = false; continue;`) | ✅ Keep | Defensive; correct |
| `supports_op` IQ1 fallback | ✅ Keep | Correct |
| Flash-attention disable on 16 KB devices | ✅ Keep | FA kernel exceeds 16 KB |
| `soft_max` / `im2col_3d` workgroup override → 32 via spec const | ✅ Keep | Surgical, host-code only |
| `pipeline_func` skip on `spv_size == 0` | ✅ Keep | Defensive |
| `vk::SystemError` recovery in pipeline creation | ✅ Keep | Defensive |
| Workgroup-size edits on ~70 barrier-free element-wise shaders | ❌ Revert | Unnecessary; minor perf regression |
| Workgroup-size edits on `norm.comp` / `rms_norm.comp` | ⚠️ Refactor | Convert to spec constant |
| `vulkan-shaders-gen.cpp` stubbing of `coopmat*` | ✅ Keep | Dead weight on A702 |
| `vulkan-shaders-gen.cpp` stubbing of standard `mul_mm` / `mul_mmq` | ❌ Revert | Cripples prefill |
| `supports_op` runtime guard `op->src[1]->ne[1] > 1 → false` | ❌ Revert | Cripples prefill |

---
*This document is part of the Sensai Documentation Suite.*
