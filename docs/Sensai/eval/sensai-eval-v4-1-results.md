# Sensai Evaluation — v4.1 Results (Synthesis & Strategy)

**Date:** 2026-05-05
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702)
**Objective:** Compare current approach with industry standards and resolve the `CL_OUT_OF_RESOURCES` fault.

---

## 1. Industry Comparison: Why Wang's Branch?

The deep dive into the current Adreno/Mesa ecosystem confirms that our selection of Hongqiang Wang's `opencl/nvidia` branch is the correct tactical choice for the following reasons:

| Path | Driver Stack | Status on Uno Q | Technical Reality |
| :--- | :--- | :--- | :--- |
| **Vulkan (Turnip)** | Mesa | **Blocked** | 16KB Shared Memory limit is a hard hardware/driver wall for mainline shaders. |
| **OpenCL (Mainline)** | Mesa (RustiCL) | **Blocked** | Mainline `llama.cpp` requires `cl_khr_subgroups`, which RustiCL/FD702 does not yet expose. |
| **OpenCL (Proprietary)**| Qualcomm | **Blocked** | Proprietary KGSL nodes (`/dev/kgsl-3d0`) are missing in the current Debian/Arduino BSP. |
| **Wang Branch** | **Mesa (RustiCL)** | **In Progress** | **Winning Path:** Uses a compatibility layer to emulate subgroups via local memory, bypassing the driver's lack of native support. |

---

## 2. Root Cause Analysis: The `CL_OUT_OF_RESOURCES` Fault

The deferred GPU fault (error -5) encountered in Eval v4 during the lm_head (Q6_K) decode step has been narrowed down to two likely culprits:

1.  **Register Pressure**: The Adreno 702 has a very limited General Purpose Register (GPR) file. Wang's subgroup-emulation preamble adds significant logic to every kernel. The `Q6_K` GEMV kernel is the most complex in the suite; it likely exceeds the register budget, causing the driver to fail or the watchdog (TDR) to timeout.
2.  **The 16KB Local Memory Wall**: While OpenCL local memory on this device is backed by DRAM (avoiding load-time failure), excessive use still causes significant performance degradation and can lead to resource exhaustion errors when combined with high register pressure.

---

## 3. Recommended Strategic Path

To make the Adreno 702 work for inference generation on the Uno Q, we will follow these tiers:

### Tier 1: Surgical Fallback (Immediate)
*   **Action**: Modify `ggml-opencl.cpp` to explicitly disable `GGML_TYPE_Q6_K` support.
*   **Rationale**: Most SLMs (like Qwen3.5-0.8B) only use Q6_K for the output layer. Falling back this single tensor to the CPU allows the rest of the model (Q4_0/Q4_K) to run on the GPU.
*   **Target**: Resolve the crash and get a full end-to-end decode.

### Tier 2: Vulkan "Lite" (Medium Term)
*   **Action**: Patch `ggml-vulkan.cpp` to force tile sizes (`GGML_VULKAN_BLOCK_SIZE`) to 16 for devices with <= 16KB shared memory.
*   **Goal**: Enable the more stable Turnip Vulkan driver by fitting within its hard memory constraints.

### Tier 3: Hexagon NPU Pivot (Long Term)
*   **Action**: Transition to the `GGML_QNN` backend to leverage the QRB2210's Hexagon DSP.
*   **Goal**: Achieve 2-4x the performance of the GPU using purpose-built AI hardware.

---

## 4. Next Steps
1.  Apply the Q6_K exclusion patch to the Wang branch.
2.  Verify end-to-end inference on the Adreno 702.
3.  Benchmark against the CPU baseline (4.15 tg tok/s).
