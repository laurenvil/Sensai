# Sensai Evaluation — v3 Results

**Date:** 2026-05-04
**Branch:** `sensai-gpu`
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X, Adreno 702)
**Model:** Qwen3.5-0.8B-Q4_0
**Objective:** Exhaust all available GPU acceleration paths via rusticl (Mesa OpenCL) on Adreno 702

---

## Background

Eval v2 left Vulkan blocked (16 KB compute shared memory < matmul shader requirement) and identified
OpenCL as the next path. The OpenCL investigation had two sub-questions:

1. Is Qualcomm's proprietary OpenCL (KGSL-based) accessible? → Check `/dev/kgsl-3d0`
2. Is Mesa's rusticl OpenCL usable with llama.cpp? → Check `FD702` device via `clinfo`

---

## Discovery: RustiCL on Adreno 702

`/dev/kgsl-3d0` does not exist. Qualcomm's proprietary KGSL driver is not loaded in the
current kernel/userspace. However, Mesa's rusticl implementation IS present and exposes the
Adreno 702 as an OpenCL 3.0 compute device:

```
Platform:    rusticl (Mesa/X.org, v25.2.6-1~bpo13+1)
Device:      FD702 (Freedreno 702 — Mesa's Adreno driver name)
OpenCL:      3.0 FULL_PROFILE
Max CUs:     1 @ 844 MHz
Global mem:  3.58 GiB (unified with CPU — zero-copy)
Local mem:   16 KiB (type: Global — backed by DRAM, not SRAM)
FP16:        cl_khr_fp16 supported
SPIR-V:      1.0–1.6 supported
Subgroups:   Max sub-groups per work group = 0 (NONE)
```

**RustiCL stack:** Mesa's OpenCL implementation written in Rust. Sits on top of the Freedreno
Gallium3D backend — the same driver stack as Turnip Vulkan. Compiles OpenCL C → NIR → Adreno ISA.
No proprietary drivers required. Fully open-source.

**Key property — `Local memory type: Global`:** Unlike Vulkan's hard 16 KB compute shared memory
barrier (which fires at shader load time), OpenCL local memory on this device is backed by global
DRAM. There is no pre-flight size check. This initially suggested that the 16 KB wall that blocked
Vulkan would not apply to OpenCL.

---

## Attempt 1: Build llama.cpp with GGML_OPENCL_USE_ADRENO_KERNELS=ON

### Build

```bash
git clone --depth=1 --branch b9014 https://github.com/ggml-org/llama.cpp /home/arduino/ArduinoApps/llama-opencl
cmake -B build \
  -DGGML_OPENCL=ON \
  -DGGML_OPENCL_EMBED_KERNELS=ON \
  -DGGML_OPENCL_USE_ADRENO_KERNELS=ON \
  -DOpenCL_INCLUDE_DIR=/home/arduino/ArduinoApps/opencl-headers \
  -DOpenCL_LIBRARY=/usr/lib/aarch64-linux-gnu/libOpenCL.so.1
make -C build llama-bench -j2
```

CMake configured successfully: `-- OpenCL will use matmul kernels optimized for Adreno`.

### Benchmark result

```
ggml_opencl: selected platform: 'rusticl'
ggml_opencl: device: 'FD702 (OpenCL 3.0 )'
Unsupported GPU: FD702
ggml_opencl: drop unsupported device.

| qwen35 0.8B Q4_0 | OpenCL | ngl=999 | t=2 | pp385 |  5.49 ± 0.02 t/s |
| qwen35 0.8B Q4_0 | OpenCL | ngl=999 | t=2 | tg50  |  2.68 ± 0.01 t/s |
```

**Root cause:** `ggml-opencl.cpp:3297` checks for "Adreno" or "Qualcomm" in the device name/version
string. The Mesa rusticl device name is `FD702` (Freedreno naming convention) — neither string
matches. The backend returns `nullptr`, no GPU layers are loaded, and llama-bench falls back to the
CPU with only `-t 2` threads (hence slower than the 4-thread CPU baseline of 4.15 tg tok/s).

---

## Patch 1: Fix FD702 Device Detection

**File:** `ggml/src/ggml-opencl/ggml-opencl.cpp:3297`

Added `strstr(dev_ctx->device_name.c_str(), "FD")` to the Adreno family detection condition.
Also corrected the wave size: rusticl reports preferred work group size multiple of 32 (not 64).

```cpp
// Before
if (strstr(dev_ctx->device_name.c_str(), "Adreno") ||
    strstr(dev_ctx->device_name.c_str(), "Qualcomm") ||
    strstr(dev_ctx->device_version.c_str(), "Adreno")) {
    ...
    backend_ctx->adreno_wave_size = 64;

// After
if (strstr(dev_ctx->device_name.c_str(), "Adreno") ||
    strstr(dev_ctx->device_name.c_str(), "Qualcomm") ||
    strstr(dev_ctx->device_version.c_str(), "Adreno") ||
    strstr(dev_ctx->device_name.c_str(), "FD")) {  // Mesa Freedreno
    ...
    backend_ctx->adreno_wave_size = strstr(dev_ctx->device_name.c_str(), "FD") ? 32 : 64;
```

---

## Patch 2: Gate cl_khr_subgroups Check

**File:** `ggml/src/ggml-opencl/ggml-opencl.cpp:3373`

The runtime check at line 3375 treats the absence of `cl_khr_subgroups` as fatal even when Adreno
kernels are disabled. Generic kernels do not require subgroups. Gated the fatal check behind
`#ifdef GGML_OPENCL_USE_ADRENO_KERNELS`; non-Adreno builds now log a warning and continue.

---

## Attempt 2: Generic OpenCL Kernels (GGML_OPENCL_USE_ADRENO_KERNELS=OFF)

### Rebuild with both patches and Adreno kernels disabled

```bash
cmake -B build -DGGML_OPENCL=ON -DGGML_OPENCL_USE_ADRENO_KERNELS=OFF ...
make -C build llama-bench -j2
```

### Result

```
ggml_opencl: selected platform: 'rusticl'
ggml_opencl: device: 'FD702 (OpenCL 3.0 )'
ggml_opencl: OpenCL driver: 25.2.6-1~bpo13+1
ggml_opencl: device lacks cl_khr_subgroups (OK for generic kernels)  ← patch working
ggml_opencl: loading OpenCL kernels...............ggml_opencl: kernel compile error:

input.cl:6:26: warning: unsupported OpenCL extension 'cl_khr_subgroups' - ignoring
input.cl:108:27: error: use of undeclared identifier 'N_SIMDGROUP'
input.cl:108:41: error: use of undeclared identifier 'get_sub_group_id'
...
input.cl:156:9: error: use of undeclared identifier 'sub_group_reduce_add'
Error executing LLVM compilation action.
```

**Root cause:** Even the "generic" (non-Adreno) matmul kernels in llama.cpp's OpenCL backend use
`cl_khr_subgroups` built-ins (`get_sub_group_id`, `get_sub_group_local_id`, `sub_group_reduce_add`,
`N_SIMDGROUP`, `N_SIMDWIDTH`). These are undefined when `cl_khr_subgroups` is absent.

The runtime init now passes all checks. The JIT compilation step (rusticl compiling embedded OpenCL C
to Adreno ISA) fails because the kernel source is unconditionally written against sub-group semantics.

---

## Definitive Findings

### GPU path status matrix

| Path | Status | Hard Blocker |
|---|---|---|
| Vulkan (Turnip/Mesa) | BLOCKED | 16 KB `maxComputeSharedMemorySize` < matmul shader |
| OpenCL — Adreno kernels (rusticl) | BLOCKED | `cl_qcom_reqd_sub_group_size` not in rusticl |
| OpenCL — generic kernels (rusticl) | BLOCKED | `cl_khr_subgroups` not available (0 sub-groups) |
| OpenCL — Qualcomm proprietary | NOT AVAILABLE | KGSL driver absent, `/dev/kgsl-3d0` missing |

All four paths are blocked at the driver/hardware-capability level of the current software stack.

### The sub-group requirement

llama.cpp's OpenCL backend (b9014) requires `cl_khr_subgroups` for **all** matrix multiply kernels,
including the Intel/generic path. The Adreno 702 via rusticl reports:

```
Max sub-groups per work group: 0
```

Sub-group operations (`sub_group_reduce_add`, `get_sub_group_id`, etc.) are not implemented in
Freedreno's rusticl backend at Mesa 25.2.6. The feature exists in Freedreno's Vulkan (Turnip)
implementation but has not been exposed through the OpenCL (rusticl) path.

### The 16 KB constraint — consistent across APIs

The Adreno 702's compute memory architecture limits fast on-chip shared memory to 16 KB per
workgroup. This shows up identically in both APIs:
- Vulkan: `maxComputeSharedMemorySize = 16384` (llama.cpp Vulkan checks this at load time → fail)
- OpenCL: `CL_DEVICE_LOCAL_MEM_SIZE = 16384, CL_LOCAL_MEM_TYPE = CL_GLOBAL` (backed by DRAM)

The OpenCL `CL_GLOBAL` type means local memory spills to DRAM — no hard compile-time check — but
all matmul kernels require sub-group reductions that are absent from the driver.

---

## What Would Actually Enable GPU Acceleration

### Near-term (months)

**Mesa/Freedreno adds cl_khr_subgroups to rusticl** — this is the single change that would unblock
the generic OpenCL path without any hardware or proprietary driver changes. The Adreno ISA has the
necessary SIMT primitives; Freedreno's Vulkan implementation exposes equivalent subgroup features.
Filing or tracking [Mesa bug tracker](https://gitlab.freedesktop.org/mesa/mesa) for
`rusticl: add cl_khr_subgroups for Freedreno (FD7xx)` is the actionable step.

### Medium-term (6–12 months)

**Qualcomm KGSL driver in kernel** — the `kgsl` kernel module (Qualcomm's GPU scheduler) exposes
`/dev/kgsl-3d0` and is required for Qualcomm's proprietary OpenCL ICD. If Qualcomm or the Arduino
board BSP ships this module for QRB2210, the proprietary OpenCL path becomes available and
llama.cpp's Adreno kernels (with `cl_qcom_reqd_sub_group_size`) would work natively. The Qualcomm
Developer blog post ("Introducing the new OpenCL GPU backend for llama.cpp") targets this path on
Android and Snapdragon X Elite; QRB2210 is in the same Qualcomm family.

**Custom sub-group-free matmul kernels** — rewrite `mul_mv_q4_0_f32.cl` and related kernels using
work-group-local reductions (no subgroup intrinsics). Performance would be lower than sub-group
implementations but would run on rusticl. Estimated effort: 2–4 weeks of OpenCL kernel engineering.

### Long-term (Ventuno Q)

**Arduino Ventuno Q** ships with Adreno 623 and Hexagon NPU (40 TOPS). The Adreno 623 is a
higher-tier GPU with established driver support; the Hexagon NPU (QNN SDK) is the primary
inference target Qualcomm designed for this use case. Neither blocker above applies there.

---

## Benchmark Summary (all runs, Uno Q)

| Version | Backend | Flags | pp tok/s | tg tok/s |
|---|---|---|---|---|
| v2 b8263 CPU | CPU | 4t | 7.24 | 2.21 |
| v2 b9014 CPU | CPU | 4t | 9.30 | 4.15 |
| v3 OpenCL build (GPU dropped) | CPU fallback | 2t | 5.49 | 2.68 |
| v3 OpenCL build (GPU dropped) vs. b9014 | — | — | −41% | −35% |

The OpenCL build with GPU device dropped is slower than the CPU baseline only because `-t 2` was
specified (intended for GPU+CPU split). The b9014 4-thread CPU path (pp=9.30, tg=4.15) remains
the production baseline.

---

## Next Steps

1. **Track Mesa `cl_khr_subgroups` for Freedreno** — monitor Mesa gitlab for FD7xx subgroup
   support; test with Mesa 25.3+ when available via backports.
2. **Ventuno Q** — pivot GPU acceleration work to Adreno 623 + Hexagon NPU on the Ventuno Q
   platform. The Hexagon NPU path (40 TOPS, QNN SDK) is purpose-built for on-device LLM inference.
3. **Consider sub-group-free kernel PR** — if Mesa subgroup support is > 6 months out, contribute
   a work-group-only Q4_0 matmul kernel to ggml/llama.cpp upstream.
