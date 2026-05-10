# Vulkan Lite Implementation Plan (v2)
## Sensai on Adreno 702 — Source Build with Permutation Trim

**Date:** 2026-05-10
**Branch:** `sensai-gpu-vulkan-v2`
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702 @ 845 MHz, 4 GB LPDDR4X)
**Driver:** Mesa Turnip (`freedreno_icd.json`), preinstalled, Vulkan 1.0.318 / Mesa 25.2.6
**Source baseline:** `llama.cpp` tag **b9049** (`https://github.com/ggml-org/llama.cpp`)

> Supersedes the previous "pre-built hybridgroup binary" plan. See
> `vulkan-gpu/vulkan-driver-stack-analysis.md` for why the system Vulkan stack is already correct
> and `vulkan-gpu/blocksize-and-matmul-stubbing-review.md` for the audit that motivates this
> rewrite.

---

## 1. What changed vs. v1

The v1 plan downloaded the upstream `hybridgroup/llama-cpp-builder` Vulkan binary and applied a
runtime IQ1 patch on top. Subsequent work in `sensai-gpu-vulkan` discovered:

1. The Adreno 702's `maxComputeSharedMemorySize = 16 KB` rejects standard `l_warptile` (64×64)
   matmul; `s_warptile` (32×32) fits — needs a host-code override, not a shader edit.
2. `norm.comp` and `rms_norm.comp` hardcode `BLOCK_SIZE = 512`, which exceeds the A702's wave
   concurrency budget for `barrier()`. They must drop to 32 (1 wave).
3. The matmul shader source (`mul_mm.comp.cpp`) compiles to **86 MB of static SPIR-V tables** in
   the generated C++ wrapper, requiring **~2 GB of resident RAM in cc1plus** — impossible on the
   4 GB Uno Q. The previous attempt stubbed `mul_mm` to fit; **this plan does not**.

v2 corrects the mistakes. Key differences:

| | v1 (pre-built + IQ1 patch) | sensai-gpu-vulkan (build + stub) | **v2 (this plan)** |
|---|---|---|---|
| `mul_mm` matmul shaders | present (no Adreno tuning) | **stubbed → 0 bytes** | **present, trimmed to 4 quant types** |
| `supports_op` `ne[1] > 1 → CPU` guard | absent | **present** (cripples prefill) | **absent** |
| `s_warptile` forcing on 16 KB devices | absent | present | **present** |
| `norm` / `rms_norm` BLOCK_SIZE 512 | present | edited GLSL `#define` → 32 | **spec constant + host override** |
| Element-wise shader workgroup edits (~70 files) | none | mass 512→32 | **none** (revert) |
| IQ1 graceful disable | runtime patch | source patch | **source patch** |
| FA disable on 16 KB devices | absent | present | **present** |
| Build host | board (4 GB) | board (failed: OOM) | **cross-compile from desktop, OR board with permutation trim** |

---

## 2. Build-without-OOM strategy: shader-gen permutation trim

The cc1plus OOM is caused by combinatorial explosion in `vulkan-shaders-gen.cpp`. The generator
emits a `(src0_type × dst_type × matmul_id × align × coopmat)` Cartesian product of matmul
variants and bakes each one's SPIR-V into a static array in a single C++ translation unit. Most of
those variants are dead weight on the Adreno 702.

### 2.1 Variants Sensai needs

Sensai's production stack uses two model files:
- `Qwen3.5-0.8B-Q4_0.gguf` (primary) — Q4_0 weights
- `Qwen3.5-0.8B-Q6_K.gguf` (alt) — Q6_K weights

Both use F32 activations and no MoE (no MUL_MAT_ID needed). The Adreno 702 has no cooperative
matrix units (no `coopmat` / `coopmat2`). So the permutation set we must keep is:

| Axis | Keep | Drop |
|---|---|---|
| `src0_type` | F32, F16, Q4_0, Q6_K | Q4_1, Q5_0, Q5_1, Q8_0, Q2_K, Q3_K, Q4_K, Q5_K, IQ1_S, IQ1_M, IQ2_*, IQ3_*, IQ4_*, MXFP4, NVFP4, Q1_0 |
| `dst_type` | F32 | F16 (we don't need fp16 dst on A702) |
| `matmul_id` | regular | MoE variant (not used by Qwen3.5) |
| `align` | both aligned + unaligned | (keep both — cheap and needed for non-power-of-2 dims) |
| `coopmat` | none | `coopmat`, `coopmat2` (Nvidia/AMD-only paths) |

F16 `src0` is kept to support the F32×F16 attention path (KQV scores, mask). Q4_0 + Q6_K cover
both production models. F32 is the activation/result type.

Estimated reduction: 86 MB → roughly 6–10 MB of generated `mul_mm.comp.cpp`. cc1plus footprint
should drop to ~150–250 MB, well within the 4 GB budget.

### 2.2 Patch shape (to be applied to `ggml/src/ggml-vulkan/vulkan-shaders/vulkan-shaders-gen.cpp`)

Locate the matmul permutation loop (the one that emits `mul_mm_*` variants). Add a
build-time guard, gated on a CMake option so non-Adreno builds remain full:

```cpp
// vulkan-shaders-gen.cpp (sketch — to be written against the real generator)
#ifdef GGML_VULKAN_SENSAI_TRIM
static const std::set<std::string> sensai_keep_src0 = {
    "f32", "f16", "q4_0", "q6_k"
};
static const std::set<std::string> sensai_keep_dst = { "f32" };
static const bool sensai_drop_matmul_id = true;
static const bool sensai_drop_coopmat   = true;
#endif

for (auto src0 : src0_types) {
    for (auto dst : dst_types) {
        for (auto mmid : { false, true }) {
            for (auto cm : coopmat_modes) {
#ifdef GGML_VULKAN_SENSAI_TRIM
                if (!sensai_keep_src0.count(src0))           continue;
                if (!sensai_keep_dst.count(dst))             continue;
                if (sensai_drop_matmul_id && mmid)           continue;
                if (sensai_drop_coopmat  && cm != COOPMAT_NONE) continue;
#endif
                emit_matmul_variant(src0, dst, mmid, cm);
            }
        }
    }
}
```

Wire the option into `ggml/src/ggml-vulkan/CMakeLists.txt`:

```cmake
option(GGML_VULKAN_SENSAI_TRIM
       "Adreno 702: emit only Q4_0/Q6_K/F32 matmul variants" OFF)
if (GGML_VULKAN_SENSAI_TRIM)
    target_compile_definitions(vulkan-shaders-gen PRIVATE GGML_VULKAN_SENSAI_TRIM)
endif()
```

The `coopmat` shader stubbing already in `sensai-gpu-vulkan` is correct and lives in the same
generator — port that part forward. The `mul_mm` / `mul_mmq` stubbing must be removed.

### 2.3 Cross-compile alternative (preferred when a build host is available)

If a Debian Trixie aarch64 desktop or VM (16+ GB RAM) is available, build there with the **full**
permutation set, no trim, and `scp` the resulting `llama-server` to the Uno Q. Mesa Turnip on the
board runs whatever aarch64 ELF binary is dropped in. This skips the cc1plus problem entirely.

Use the trim only when on-device build is required.

---

## 3. Source patches

All patches apply to a fresh clone of `https://github.com/ggml-org/llama.cpp` at tag `b9049`.

### 3.1 `ggml/src/ggml-vulkan/ggml-vulkan.cpp` — host-code patches

Carry forward the correct subset of the v1 patches and add the `norm`/`rms_norm` host overrides.

**Keep** (already present in `sensai-gpu-vulkan`):

- 16 KB device detection → force `l_warptile = m_warptile = s_warptile` and the matching
  `*_mmq*`, `*_mmqid*`, `*_align`, `*_wg_denoms` overrides.
- IQ1 graceful disable: change the `throw` in `ggml_vk_load_shaders` to per-type
  `mul_mat_s[i] = mul_mat_m[i] = mul_mat_l[i] = false; continue;`.
- `supports_op` IQ1 fallback: `if (!mul_mat_s && !mul_mat_m && !mul_mat_l) return false;`.
- Flash-attention disable on 16 KB devices: `if (maxComputeSharedMemorySize <= 16384) return false;`
  in the `GGML_OP_FLASH_ATTN_EXT` branch of `supports_op`.
- `soft_max` and `im2col_3d` workgroup-size override → 32 on 16 KB devices via
  specialization constants.
- `pipeline_func` defensive skip on `spv_size == 0` and the `vk::SystemError` recovery in pipeline
  creation (these are good hygiene even without stubbing).

**Add** (new in v2):

- `norm` / `rms_norm` workgroup-size override → 32 on 16 KB devices, passed as a specialization
  constant. See §3.2.

**Remove** (must NOT be carried forward from `sensai-gpu-vulkan`):

- The `if (op->src[1]->ne[1] > 1) return false;` guard in the `GGML_OP_MUL_MAT` branch of
  `supports_op`. This crippled prefill in v1.

### 3.2 `norm.comp` and `rms_norm.comp` — refactor to specialization constants

Replace the compile-time `#define BLOCK_SIZE 512` with a Vulkan specialization constant. This
matches what `soft_max.comp` already does upstream and keeps the source identical for
non-Adreno builds (default 512 is unchanged).

**`ggml/src/ggml-vulkan/vulkan-shaders/norm.comp`:**

```glsl
// OLD
#define BLOCK_SIZE 512
layout(local_size_x = BLOCK_SIZE, local_size_y = 1, local_size_z = 1) in;

// NEW
layout(constant_id = 0) const uint BLOCK_SIZE = 512;
layout(local_size_x_id = 0, local_size_y = 1, local_size_z = 1) in;
```

The body of the shader (`shared vec2 sum[BLOCK_SIZE]`, the `for (uint col = tid; col < p.KX; col += BLOCK_SIZE)`
loop, and the `for (int s = BLOCK_SIZE / 2; s > 0; s >>= 1)` reduction) compiles unchanged
because `BLOCK_SIZE` is now a `const uint` — the SPIR-V compiler folds it at pipeline creation.

**`ggml/src/ggml-vulkan/vulkan-shaders/rms_norm.comp`:** identical refactor. Note that
`rms_norm.comp` already uses `layout (constant_id = 1) const bool do_multiply = false;` — pick a
free `constant_id` (e.g. `2`) to avoid collision.

**Host-code dispatch** in `ggml-vulkan.cpp` (in the section that creates `pipeline_norm_*` and
`pipeline_rms_norm_*`):

```cpp
uint32_t norm_block_size = 512;
if (device->properties.limits.maxComputeSharedMemorySize <= 16384) {
    norm_block_size = 32;
}

ggml_vk_create_pipeline(device, device->pipeline_norm_f32, "norm_f32",
    norm_f32_len, norm_f32_data, "main", 2, sizeof(vk_op_push_constants),
    {1, 1, 1}, { norm_block_size }, 1);

ggml_vk_create_pipeline(device, device->pipeline_rms_norm_f32, "rms_norm_f32",
    rms_norm_f32_len, rms_norm_f32_data, "main", 3, sizeof(vk_op_push_constants),
    {1, 1, 1}, { norm_block_size }, 1);
```

Single source of truth, easy to revert per-device, no fork from upstream for non-Adreno targets.

### 3.3 Other shader edits — revert

The `sensai-gpu-vulkan` branch edited 81 `.comp` files to drop `local_size_x = 512` to `32`.
A barrier audit shows only 43 of 153 shaders contain `barrier()` calls, and only ~10 of those
matter for inference (`norm`, `rms_norm`, `soft_max`, `add`, `argsort`, `sum_rows`, `flash_attn*`,
`mul_mm` family). For element-wise / dequant shaders without barriers, the wave-concurrency wall
does not apply — shrinking the workgroup multiplies dispatch overhead with no benefit.

**Action:** start from a clean b9049 tree. Apply only:
- The norm/rms_norm refactor (§3.2)
- The host-code patches (§3.1)
- The shader-gen trim (§2.2)
- The existing `coopmat` stubbing in `vulkan-shaders-gen.cpp`

Do not bulk-edit element-wise shaders.

### 3.4 Patches that stay (summary)

| Patch | Location | Status |
|---|---|---|
| 16 KB device detection + s_warptile forcing | `ggml-vulkan.cpp` (`ggml_vk_load_shaders`) | ✅ keep |
| IQ1 graceful disable | `ggml-vulkan.cpp` (matmul shmem loop) | ✅ keep |
| `supports_op` IQ1 fallback | `ggml-vulkan.cpp` (`GGML_OP_MUL_MAT`) | ✅ keep |
| FA disable on 16 KB | `ggml-vulkan.cpp` (`GGML_OP_FLASH_ATTN_EXT`) | ✅ keep |
| `soft_max` / `im2col_3d` wg→32 via spec const | `ggml-vulkan.cpp` (pipeline creation) | ✅ keep |
| `pipeline_func` defensive recovery | `ggml-vulkan.cpp` | ✅ keep |
| `norm` / `rms_norm` → spec constant | `norm.comp`, `rms_norm.comp` | ✅ **new in v2** |
| Norm wg→32 host override | `ggml-vulkan.cpp` (pipeline creation) | ✅ **new in v2** |
| `coopmat` / `coopmat2` shader stubbing | `vulkan-shaders-gen.cpp` | ✅ keep |
| Sensai shader-gen permutation trim | `vulkan-shaders-gen.cpp`, `CMakeLists.txt` | ✅ **new in v2** |
| Element-wise shader wg→32 (~70 files) | `*.comp` | ❌ revert |
| `mul_mm` / `mul_mmq` stubbing | `vulkan-shaders-gen.cpp` | ❌ revert |
| `supports_op` `ne[1] > 1 → false` | `ggml-vulkan.cpp` (`GGML_OP_MUL_MAT`) | ❌ revert |

---

## 4. Build procedure

### 4.1 Path A — cross-compile from a desktop (preferred)

On a Debian Trixie aarch64 host (or x86_64 host with an aarch64 sysroot):

```bash
git clone https://github.com/ggml-org/llama.cpp ~/build/llama-vulkan
cd ~/build/llama-vulkan
git checkout b9049

# Apply the Sensai v2 patches (§3.1–§3.2) — full mul_mm permutations kept
# (No need to enable GGML_VULKAN_SENSAI_TRIM on a 16 GB host.)

cmake -S . -B build-vulkan \
    -DGGML_VULKAN=ON \
    -DGGML_OPENCL=OFF \
    -DCMAKE_BUILD_TYPE=Release \
    -DGGML_NATIVE=OFF \
    -DLLAMA_BUILD_SERVER=ON \
    -DBUILD_SHARED_LIBS=ON

cmake --build build-vulkan --target llama-server llama-bench -j$(nproc)

# Stage and copy to the Uno Q
mkdir staging && cp build-vulkan/bin/llama-server build-vulkan/bin/llama-bench \
    build-vulkan/lib/libggml*.so build-vulkan/lib/libllama.so staging/
scp staging/* arduino@unoq:~/ArduinoApps/Sensai/yzma/lib-vulkan/
```

### 4.2 Path B — on-device build with permutation trim (fallback)

On the Uno Q itself:

```bash
git clone https://github.com/ggml-org/llama.cpp ~/ArduinoApps/llama-cpp-vulkan
cd ~/ArduinoApps/llama-cpp-vulkan
git checkout b9049

# Apply the Sensai v2 patches, INCLUDING §2.2 generator trim + CMake option.

cmake -S . -B build-vulkan \
    -DGGML_VULKAN=ON \
    -DGGML_VULKAN_SENSAI_TRIM=ON \
    -DGGML_OPENCL=OFF \
    -DCMAKE_BUILD_TYPE=Release \
    -DGGML_NATIVE=OFF \
    -DLLAMA_BUILD_SERVER=ON \
    -DBUILD_SHARED_LIBS=ON

cmake --build build-vulkan --target llama-server llama-bench -j2

# Symlink into the Sensai layout
mkdir -p ~/ArduinoApps/Sensai/yzma/lib-vulkan
cp build-vulkan/bin/llama-server build-vulkan/bin/llama-bench \
   build-vulkan/lib/libggml*.so build-vulkan/lib/libllama.so \
   ~/ArduinoApps/Sensai/yzma/lib-vulkan/
```

If even the trimmed build OOMs (unlikely but possible on a fully-loaded board), a one-shot zram
swap of 2 GB during the `mul_mm.comp.cpp` compile step will close the gap:

```bash
sudo modprobe zram && \
    echo 2G | sudo tee /sys/block/zram0/disksize && \
    sudo mkswap /dev/zram0 && sudo swapon /dev/zram0
# ...build...
sudo swapoff /dev/zram0
```

---

## 5. The 16 KB shared memory constraint

Background unchanged from v1. Mainline llama.cpp Vulkan defines three matmul tiling profiles:

| Profile | Shared mem usage | Status on FD702 |
|---|---|---|
| `l_warptile` (large, 64×64) | 16.9 KB | rejected (auto-fallback) |
| `m_warptile` (medium, 32×32) | 8.4 KB | works |
| `s_warptile` (small, 16×16) | 4.2 KB | works |

The §3.1 host-code patch forces all three profiles to `s_warptile` on devices with
`maxComputeSharedMemorySize <= 16384`. Mainline already auto-rejects `l_warptile`; forcing
`m_warptile` down to `s_warptile` provides additional headroom and consistency.

### 5.1 IQ1 LUT issue (unchanged)

IQ1_S / IQ1_M use 12 KB lookup tables that, combined with tile buffers, exceed 16 KB. The
graceful-disable patch (§3.1) routes IQ1 tensors to the CPU. Sensai's production models
(`Qwen3.5-0.8B-Q4_0`, `Qwen3.5-0.8B-Q6_K`) do not use IQ1; this is a defensive fallback only.

---

## 6. Environment and launch flags

`make sensai-vulkan` / `scripts/sensai-vulkan-launch.sh` sets:

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json
LD_LIBRARY_PATH=yzma/lib-vulkan:$LD_LIBRARY_PATH
```

llama-server flags:

| Flag | Value | Reason |
|---|---|---|
| `-ngl 999` | offload all layers | s_warptile fits in 16 KB; matmul stays on GPU |
| `--no-flash-attn` | disable FA | FA kernel exceeds 16 KB; standard attention used |
| `--ctx-size 512` | 512 tokens | Stay within single-CU GPU TDR budget (~5 s) |
| `-t 2` | 2 CPU threads | Minimal CPU use (only IQ1 fallback paths, if any) |
| `--parallel 1` | 1 slot | Avoid context fragmentation on 4 GB LPDDR4X |
| `--host 127.0.0.1` | loopback | Local-only; gateway handles external |
| `--port 8080` | default | OpenAI-compat endpoint for picoclaw gateway |

---

## 7. Benchmark plan

Run after the build completes. Results land in `docs/Sensai/eval/gpu/vulkan-eval-v2.md`.

### 7.1 Verify Vulkan device

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
    yzma/lib-vulkan/llama-server --list-devices 2>&1 | head -20
```

Expected: `Turnip Adreno (TM) 702`, `maxComputeSharedMemorySize = 16384`.

### 7.2 CPU baseline (reference)

```bash
yzma/lib/llama-bench \
    -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
    -ngl 0 -t 4 \
    -p 32,128,512 -n 64 -r 3
```

### 7.3 Vulkan v2 GPU (real mat-mat, no stub)

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
LD_LIBRARY_PATH=yzma/lib-vulkan \
    yzma/lib-vulkan/llama-bench \
        -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
        -ngl 999 -t 2 \
        --no-flash-attn \
        -p 32,128,512 -n 64 -r 3
```

### 7.4 Vulkan v2 GPU — Q6_K

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
LD_LIBRARY_PATH=yzma/lib-vulkan \
    yzma/lib-vulkan/llama-bench \
        -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
        -ngl 999 -t 2 \
        --no-flash-attn \
        -p 32,128,512 -n 64 -r 3
```

The key comparison is **prefill (`pp32` / `pp128` / `pp512`)** — v1 measured 1.0 t/s because
mat-mat was routed to CPU through a Vulkan trampoline. v2 keeps mat-mat on GPU; the question is
whether real Adreno 702 mat-mat at `s_warptile` outpaces the 8.1 t/s CPU baseline.

---

## 8. File inventory

| File | Role |
|---|---|
| `yzma/lib-vulkan/llama-server` | Sensai inference binary, built per §4 |
| `yzma/lib-vulkan/llama-bench` | Benchmark binary |
| `yzma/lib-vulkan/libggml-vulkan.so` | Vulkan GGML backend (v2 patches) |
| `scripts/sensai-vulkan-launch.sh` | Launch script: VK_ICD_FILENAMES, LD_LIBRARY_PATH |
| `docs/Sensai/Vulkan/vulkan-lite-feasibility-study.md` | Original design rationale |
| `docs/Sensai/Vulkan/vulkan-implementation-plan.md` | This document (v2) |
| `docs/Sensai/Vulkan/vulkan-gpu/whitepaper.md` | v1 phase-2 implementation report |
| `docs/Sensai/Vulkan/vulkan-gpu/vulkan-driver-stack-analysis.md` | Mesa Turnip / loader / ICD clarification |
| `docs/Sensai/Vulkan/vulkan-gpu/blocksize-and-matmul-stubbing-review.md` | Audit motivating v2 |
| `docs/Sensai/eval/gpu/vulkan-eval-v1.md` | v1 results (stubbed mat-mat) |
| `docs/Sensai/eval/gpu/vulkan-eval-v2.md` | v2 results (to be written) |
| `docs/Sensai/eval/gpu/wave-concurrency-analysis.md` | Why BLOCK_SIZE 32 is required |

---

## 9. Out of scope for v2

These remain open after v2 lands and are tracked separately:

- **Real subgroup reductions in `norm` / `rms_norm`.** With `BLOCK_SIZE = 32` matching the A702
  wave width, the entire reduction collapses into a single `subgroupAdd` — no shared memory, no
  `barrier()`. Worth a follow-up since Mesa Turnip exposes `Shuffle` / `Arithmetic`.
- **Mat-vec batching.** Single-CU mat-vec is memory-bound; even with real GPU mat-mat, generation
  may stay close to CPU. Investigating batched generation (`--parallel 2+`) requires the
  `ne[1] > 1 → CPU` guard to be gone, which v2 ensures.
- **Hexagon NPU path on Ventuno Q (Q2 2026).** Vulkan Lite is the bridge until the NPU stack is
  available; the v2 work simplifies the eventual hand-off.

---

## 10. References

| Source | URL |
|---|---|
| llama.cpp upstream | `https://github.com/ggml-org/llama.cpp` |
| Mesa Turnip Vulkan driver | `https://docs.mesa3d.org/drivers/freedreno.html` |
| llama.cpp Vulkan backend | `https://github.com/ggml-org/llama.cpp/blob/master/docs/vulkan.md` |
| Vulkan Lite feasibility study | `docs/Sensai/Vulkan/vulkan-lite-feasibility-study.md` |
| Driver stack analysis | `docs/Sensai/Vulkan/vulkan-gpu/vulkan-driver-stack-analysis.md` |
| BLOCK_SIZE / stubbing review | `docs/Sensai/Vulkan/vulkan-gpu/blocksize-and-matmul-stubbing-review.md` |
| Wave concurrency analysis | `docs/Sensai/eval/gpu/wave-concurrency-analysis.md` |
