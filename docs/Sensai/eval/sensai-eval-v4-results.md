# Sensai Evaluation — v4 Results

**Date:** 2026-05-05
**Branch:** `sensai-gpu`
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X, Adreno 702)
**Model:** Qwen3.5-0.8B-Q4_0.gguf
**Objective:** Activate GPU inference via Wang's `opencl/nvidia` branch (`use_no_subgroups_compat`)
**Source:** `https://github.com/wanghqc/llama.cpp`, branch `opencl/nvidia`

---

## Background

Eval v3 found that all four GPU paths on Adreno 702 are blocked:
- **Vulkan (Turnip):** 16 KB `maxComputeSharedMemorySize` < matmul shader requirement
- **OpenCL Adreno kernels:** `cl_qcom_reqd_sub_group_size` absent from rusticl
- **OpenCL generic kernels:** `cl_khr_subgroups` absent (max sub-groups = 0)
- **Qualcomm proprietary OpenCL:** KGSL driver missing (`/dev/kgsl-3d0` absent)

The conclusion at the time was that a Mesa driver update adding `cl_khr_subgroups` for FD7xx was
the only realistic near-term path.

Eval v4 tests a fourth option discovered independently: Hongqiang Wang's
`wanghqc/llama.cpp` `opencl/nvidia` branch, which implements a **`use_no_subgroups_compat`** mode
specifically designed to run OpenCL inference on drivers without native subgroup support.

---

## Wang's Branch: `use_no_subgroups_compat`

Wang's branch adds an experimental compatibility layer for OpenCL devices that lack `cl_khr_subgroups`.
The mechanism:

1. **Macro preamble injection:** At kernel compile time, a compatibility header is prepended to every
   OpenCL source. It defines:
   ```c
   #define NVIDIA_GPU 1
   #define INTEL_GPU  1
   // Sub-group builtins → work-group equivalents:
   #define get_sub_group_id()       (0)
   #define get_sub_group_local_id() (get_local_id(0))
   #define get_sub_group_size()     (get_local_size(0))
   #define sub_group_reduce_add(x)  (x)       // stub for nth0=1 kernels only
   #define sub_group_broadcast(x,l) (x)
   ```
   Hot kernels (Q4_K GEMV, Q6_K GEMV) override the stub reduction with `__local` tree-reduction
   inside `#ifdef NVIDIA_GPU` blocks; they never touch `sub_group_reduce_add`.

2. **Automatic activation:** `use_no_subgroups_compat` fires when `cl_khr_subgroups` is absent or
   when `NVIDIA` appears in the device name.

3. **SOA weight layout (`GGML_OPENCL_SOA_Q`, always on):** Quantized tensors are split into
   separate struct-of-arrays buffers during model load (e.g., `ql`, `qh`, `s`, `d` for Q6_K; `qs`,
   `d`, `m` for Q4_1). This avoids AOS interleave penalties in kernel memory access patterns.

**Why this is promising for FD702:**
- FD702 rusticl reports `max sub-groups = 0` but OpenCL 3.0 is otherwise functional
- The preamble substitutes all subgroup calls with equivalent local-memory alternatives
- No proprietary extensions required — pure OpenCL C + barriers

---

## Setup and Initial Build

Cloned Wang's branch into `/home/arduino/ArduinoApps/llama-wang/`:

```bash
git clone --depth=1 --branch opencl/nvidia \
  https://github.com/wanghqc/llama.cpp /home/arduino/ArduinoApps/llama-wang
cmake -B build \
  -DGGML_OPENCL=ON \
  -DGGML_OPENCL_EMBED_KERNELS=ON \
  -DGGML_OPENCL_USE_ADRENO_KERNELS=ON \
  -DOpenCL_INCLUDE_DIR=/home/arduino/ArduinoApps/opencl-headers \
  -DOpenCL_LIBRARY=/usr/lib/aarch64-linux-gnu/libOpenCL.so.1
make -C build llama-bench -j2
```

Build succeeded. All 95+ OpenCL kernel files compiled without error.

---

## Patch 1: FD702 Device Classification

**Problem:** The device name `FD702` does not contain "NVIDIA", so `use_no_subgroups_compat`
does not auto-fire. The device also falls through the Adreno detection block (which checks for
"Adreno" or "Qualcomm"). Result: `Unsupported GPU: FD702` → abort.

**Fix (`ggml-opencl.cpp`, `ggml_cl2_init()`):**

```cpp
} else if (strstr(dev_ctx->device_name.c_str(), "FD") ||
           strstr(dev_ctx->platform_name.c_str(), "rusticl")) {
    // Mesa Freedreno (rusticl): device is FD<gpu> e.g. FD702.
    // No cl_khr_subgroups; use_no_subgroups_compat fires automatically below.
    GGML_LOG_WARN("ggml_opencl: treating Mesa Freedreno '%s' as generic "
                  "(experimental, no-subgroups compat)\n",
                  dev_ctx->device_name.c_str());
    backend_ctx->gpu_family = GPU_FAMILY::INTEL;
    backend_ctx->adreno_wave_size = 32;  // rusticl prefers 32-wide WGs
}
```

After this patch, `use_no_subgroups_compat` fires (no `cl_khr_subgroups`) and the preamble
is injected into all kernel sources. Kernel compilation succeeds.

---

## Patch 2: SOA Conversion Dispatch (CL_INVALID_WORK_GROUP_SIZE on load)

**Problem:** The SOA conversion kernels for Q4_1, Q5_0, Q8_0, and MXFP4 types were dispatched
with a 3D `{n, 1, 1}` global work size and a computed `lws` of 64. FD702 (rusticl) rejected some
of these with `CL_INVALID_WORK_GROUP_SIZE (-54)` during weight loading — before inference started.

**Root cause:** rusticl enforces a per-kernel local memory + private register pressure limit
(~16 KB threshold). For small tensors, `n < lws` caused the division to produce `lws=1` via
the halving loop, but the original 3D dispatch still failed in some cases.

**Fix:** Switch all four SOA conversion kernels to a 1D dispatch with `NULL` local work size
(driver chooses), eliminating the constraint entirely:

```cpp
// Before (all four SOA types):
size_t global_work_size[] = {num_blocks, 1, 1};
size_t local_work_size[]  = {lws, 1, 1};
CL_CHECK(clEnqueueNDRangeKernel(queue, kernel, 3, NULL,
    global_work_size, local_work_size, 0, NULL, &evt));

// After:
size_t global_work_size[] = {num_blocks};
CL_CHECK(clEnqueueNDRangeKernel(queue, kernel, 1, NULL,
    global_work_size, NULL, 0, NULL, &evt));
```

Weight loading now completes cleanly for all quantized types.

---

## Patch 3: l4_lm GEMM Tile Size Reduction (BM/BN 64→32)

**Problem:** The l4_lm local-memory GEMM kernels (used for batch prefill, `ne11 > 1`) allocate
two local tiles: `local float buf_a[BM * BK]` and `local float buf_b[BN * BK]`. With
`BM=BN=64, BK=32`: `2 × 64 × 32 × 4 = 16 384 bytes = 16 KB`. This is exactly the FD702 limit.
rusticl rejects the work group with `CL_INVALID_WORK_GROUP_SIZE`.

**Fix:** Reduce `BM` and `BN` from 64 to 32 in all 9 `*_l4_lm.cl` kernel files, and update the
corresponding thread count (`nth0`) and dispatch dimensions in `ggml-opencl.cpp`:

```c
// All *_l4_lm.cl files (9 files):
#define BM 32  // was 64
#define BN 32  // was 64
#define BK 32
// Local mem: 2 × 32 × 32 × 4 = 8 KB  ← fits 16 KB limit
```

```cpp
// ggml-opencl.cpp: all l4_lm dispatch sites
nth0 = 32;  // was 128 = (BM*BN)/(TM*TN) = (64*64)/(4*8)
// gws[0]: CEIL_DIV(ne01, 32)*nth0  (was 64)
// gws[1]: CEIL_DIV(ne11, 32)       (was 64)
```

Files changed: `mul_mm_f32_f32_l4_lm.cl`, `mul_mm_f16_f32_l4_lm.cl`, `mul_mm_q4_0_f32_l4_lm.cl`,
`mul_mm_q4_1_f32_l4_lm.cl`, `mul_mm_q8_0_f32_l4_lm.cl`, `mul_mm_q4_k_f32_l4_lm.cl`,
`mul_mm_q4_k_f32_l4_lm_packed.cl`, `mul_mm_q4_k_f32_l4_lm_qst.cl`,
`mul_mm_q4_k_f32_l4_lm_qst_n32.cl`, `mul_mm_q6_k_f32_l4_lm.cl`.

---

## Patch 4: gated_delta_net Dispatch Fix

**Problem:** `kernel_gated_delta_net_f32` was dispatched with
`lws = {S_v, 1, 1}` where `S_v` is the value-head dimension (up to 128). On FD702 this was
rejected with `CL_INVALID_WORK_GROUP_SIZE` (the kernel uses a large private array `float s_private[128]`
which exceeds the private register file budget at lws=128).

**Fix:** Force `lws = {1, 1, 1}` (serial per work item; already correct for this all-serial kernel):

```cpp
size_t local_work_size[3] = { 1, 1, 1 };  // was { S_v, 1, 1 }
```

---

## Patch 5: enqueue_ndrange_kernel Fallback — Proportional gws/lws Scaling

**Problem:** The original fallback for `CL_INVALID_WORK_GROUP_SIZE` reset `lws` to `{1,1,1}`
while leaving `gws` unchanged:

```cpp
// Original (BROKEN) fallback:
size_t lws_one[] = {1, 1, 1};
err = clEnqueueNDRangeKernel(queue, kernel, work_dim, NULL,
    global_work_size, lws_one, ...);
```

This is semantically wrong for all kernels that use `get_group_id(0)` as a row/head index.
With the original dispatch `gws={ne01*nth, ne02, ne03}` and `lws={nth,1,1}`:
- Correct: `get_group_id(0)` = global_id(0) / nth = row index ∈ [0, ne01)
- With lws=1: `get_group_id(0)` = global_id(0) = row index ∈ [0, ne01*nth) → **nth× OOB**

For the rope kernel (`gws={8×64, 10, 1}`, `lws={64,1,1}`): `i1 = get_group_id(0)` would range
0..511 instead of 0..7. Every access `i1 * nb01` overshots the tensor by 64× → GPU hardware fault
(OOB write). The fault is deferred by rusticl; `clEnqueueReadBuffer` for the next get_tensor call
returns `CL_OUT_OF_RESOURCES (-5)`.

**Fix:** Scale BOTH `gws[0]` and `lws[0]` proportionally so `gws[0]/lws[0]` (the work-group
count = semantic row count) remains constant:

```cpp
if (err == CL_INVALID_WORK_GROUP_SIZE
    && local_work_size != NULL && local_work_size[0] > 1) {
    // Scale gws[0] and lws[0] together to preserve work-group count.
    size_t lws_try[3] = {local_work_size[0]/2,
                          work_dim > 1 ? local_work_size[1] : 1,
                          work_dim > 2 ? local_work_size[2] : 1};
    size_t gws_try[3] = {global_work_size[0]/2,
                          work_dim > 1 ? global_work_size[1] : 1,
                          work_dim > 2 ? global_work_size[2] : 1};
    while (lws_try[0] >= 1 && err == CL_INVALID_WORK_GROUP_SIZE) {
        err = clEnqueueNDRangeKernel(queue, kernel, work_dim, NULL,
            gws_try, lws_try, 0, NULL, NULL);
        if (err == CL_INVALID_WORK_GROUP_SIZE && lws_try[0] > 1) {
            gws_try[0] /= 2;
            lws_try[0] /= 2;
        } else {
            break;
        }
    }
}
```

---

## Current Status: Persistent GPU Fault

After all five patches, the benchmark builds and runs, but crashes on the first decode step:

```
ggml_opencl: treating Mesa Freedreno 'FD702' as generic (experimental, no-subgroups compat)
ggml_opencl: enabling no-subgroups compatibility mode for 'FD702'
ggml_opencl: device local mem size: 16 KB
ggml_opencl: building kernels with no-subgroups compatibility mode for 'FD702'
ggml_opencl: loading OpenCL kernels... [OK]

[Q6K-DISPATCH] src0type=q6_K ne00=1024 ne01=248320 ne11=1
[Q6K-DISPATCH] extra0_q6_K->ql=0x... qh=0x... s=0x... d=0x...
[Q6K-DISPATCH] size_ql=127139840 size_qh=63569920 size_s=15892480 size_d=1986560

[RBERR] clEnqueueReadBuffer err=-5 tensor='result_output' type=f32
GGML_ASSERT(0) failed at ggml-opencl.cpp:6708
```

**Fault signature:** `CL_OUT_OF_RESOURCES (-5)` on `clEnqueueReadBuffer` for `result_output`.
This is a deferred GPU hardware fault: a GPU kernel caused an out-of-bounds memory access, and
the error surfaces at the next host-accessible GPU command (the readback).

**Diagnosis so far:**

The last kernel dispatched before the readback is `kernel_mul_mv_q6_K_f32_flat` — the Q6_K GEMV
kernel that handles the lm_head projection (248320 output rows × 1024 input columns). The Q6K
kernel is the only one in Wang's branch that uses `__local float4 lm[32]` tree-reduction (512 B
local mem, well within limit) in the `NVIDIA_GPU` code path, which FD702 takes via the compat preamble.

The dispatch for this kernel looks arithmetically correct:
- `gws = {(248320/4) * 32, 1, 1} = {1,986,560, 1, 1}`, `lws = {32, 1, 1}`
- `first_row = group_id(0) * 4` → max `first_row + 3 = 248319 < 248320` ✓
- SOA buffer sizes match: `size_ql = 127,139,840 = 248320 × 4 × 128` ✓

Whether the fault is in the Q6K kernel itself or in an earlier kernel whose deferred error is
only surfacing at the Q6K readback is **unconfirmed**. The next debugging step — adding `clFinish`
after the Q6K dispatch to distinguish these cases — was not completed before this commit.

---

## Summary of All Patches Applied to Wang's Branch

| Patch | File(s) | Change |
|---|---|---|
| FD702 device detection | `ggml-opencl.cpp` | Classify FD702 as INTEL-family, wave_size=32 |
| SOA conversion dispatch | `ggml-opencl.cpp` | 1D null-lws for Q4_1/Q5_0/Q8_0/MXFP4 SOA kernels |
| l4_lm tile size | 9 `*_l4_lm.cl` files + `ggml-opencl.cpp` | BM/BN 64→32, nth0 128→32, gws divisor 64→32 |
| gated_delta_net | `ggml-opencl.cpp` | Force `lws={1,1,1}` |
| Fallback scaling | `ggml-opencl.cpp` | Proportional gws[0]/lws[0] halving on -54 |

---

## Analysis: Why Wang's Branch is the Correct Path

Wang's `opencl/nvidia` branch is the right foundation because:

1. **It is the only known llama.cpp branch** targeting OpenCL without `cl_khr_subgroups`. All
   mainline builds (b9014+) require subgroups unconditionally.

2. **The compatibility layer is architecturally sound.** The NVIDIA GPU path for hot kernels
   (Q4_K GEMV, Q6_K GEMV) uses `__local` tree-reduction instead of `sub_group_reduce_add`.
   This is exactly what rusticl/FD702 needs — no subgroup ISA instructions required.

3. **The FD702 device matches Wang's NVIDIA assumptions.** Both NVIDIA OpenCL and rusticl:
   - Lack `cl_khr_subgroups`
   - Use a 32-wide preferred work-group size
   - Report `CL_LOCAL_MEM_TYPE = CL_GLOBAL` (DRAM-backed local mem, no SRAM budget)

4. **Most blockers are dispatch parameter issues, not kernel logic issues.** Patches 1–5 are all
   in `ggml-opencl.cpp` dispatch code or kernel tile sizes — they don't touch the compute math.
   The subgroup-compat preamble itself compiled and executed without kernel build errors.

---

## GPU Acceleration Status Matrix (updated)

| Path | Status | Notes |
|---|---|---|
| Vulkan (Turnip) | BLOCKED | 16 KB shared memory < shader requirement — hardware limit |
| OpenCL Adreno kernels | BLOCKED | `cl_qcom_reqd_sub_group_size` absent from rusticl |
| OpenCL generic kernels (mainline b9014) | BLOCKED | `cl_khr_subgroups` absent |
| OpenCL proprietary KGSL | NOT AVAILABLE | `/dev/kgsl-3d0` absent |
| **Wang branch (no-subgroups compat)** | **IN PROGRESS** | Kernels load; decode crashes with CL_OUT_OF_RESOURCES |

---

## Next Steps

1. **Isolate GPU fault source** — add `clFinish` after the Q6K dispatch to determine whether
   the fault is in Q6K itself or earlier. If in Q6K, audit the `NVIDIA_GPU` tree-reduction path
   for correctness under FD702's memory model. If earlier, re-enable per-kernel clFinish tracing.

2. **Q6K kernel alternative** — if `kernel_mul_mv_q6_K_f32_flat` is the fault source, fall back
   to routing Q6_K tensors through CPU (exclude from `ggml_opencl_supports_op`) and test if
   Q4_0-only GPU inference completes. Qwen3.5-0.8B-Q4_0.gguf has only one Q6_K tensor (the shared
   token embedding / lm_head weight, 248320 × 1024 × 1.5 bits/weight ≈ 188 MB). CPU fallback for
   this single tensor is acceptable.

3. **Benchmark** — once decode completes without crash, run:
   ```bash
   RUSTICL_ENABLE=freedreno LD_LIBRARY_PATH=build/bin \
   build/bin/llama-bench -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
     -ngl 999 -t 2 -p 385 -n 50 -r 3
   ```
   Expected GPU benefit: prefill (pp) should improve significantly (GPU parallelism on the Q4_0
   GEMV and GEMM ops). Decode (tg) is memory-bandwidth bound; the unified DRAM means GPU and CPU
   share bandwidth — improvement may be modest.

4. **Upstream** — if FD702 inference is validated, the FD702 detection patch + fallback scaling
   fix are clean contributions worth proposing to Wang's branch via GitHub issue/PR.
