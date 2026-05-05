# Sensai Evaluation — v4.2 Results (Tier 1 Validation)

**Date:** 2026-05-05
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702)
**Software:** `llama.cpp` (Wang's `opencl/nvidia` branch) + Q6_K Fallback Patch
**Model:** Qwen3.5-0.8B-Q4_0.gguf

---

## 1. Test Execution

Following the "Surgical Fallback" strategy, the `Q6_K` tensors (used in the output layer) were excluded from GPU offloading via a patch to `ggml_opencl_supports_op`. Testing was performed using `llama-bench`.

### Results Matrix

| Batch Size (p) | Status | Performance (t/s) | Notes |
| :--- | :--- | :--- | :--- |
| `-p 1` | **SUCCESS** | 0.22 | End-to-end inference completed. |
| `-p 2` | **SUCCESS** | 0.34 | End-to-end inference completed. |
| `-p 32` | **FAILED** | N/A | `CL_OUT_OF_RESOURCES` at `result_norm`. |
| `-p 385` | **FAILED** | N/A | `CL_OUT_OF_RESOURCES` at `result_norm`. |

---

## 2. Technical Analysis

### The Functionality Breakthrough
The Q6_K fallback effectively resolves the previous crash at the end of the decode graph (`result_output`). By moving the most complex kernel to the CPU, the GPU is now able to process the preceding transformer layers.

### The Performance Bottleneck (20x Slowness)
GPU performance (0.22 t/s) is currently **20x slower** than the CPU baseline (4.15 t/s). This extreme slowness is attributed to:
1.  **Generic Kernel Overhead**: Using the `no-subgroups compat` mode forces a `__local` tree-reduction for every normalization and dot product. On the low-end Adreno 702, this is significantly less efficient than the SIMD/subgroup operations the hardware is designed for.
2.  **Register Pressure**: The compatibility logic increases register usage per thread, dropping occupancy to levels where the GPU cannot effectively hide memory latency.

### The Stability Bottleneck (Timeout -5)
The `CL_OUT_OF_RESOURCES` error for `p > 2` is diagnosed as a **GPU Watchdog Timeout (TDR)**. Because the kernels are executing so slowly, the total time for a command buffer of 32+ rows exceeds the Linux kernel's safety threshold, causing a GPU reset.

---

## 3. Revised Strategy

Tier 1 has proven that **GPU acceleration via generic OpenCL is not viable** for production on the Adreno 702 due to the extreme performance gap compared to the CPU. 

### Next Steps:
*   **Tier 2: Vulkan Lite**: Attempt to fit `llama.cpp`'s Vulkan shaders into the 16KB shared memory limit by reducing tile sizes. Vulkan (Turnip) is generally more efficient than RustiCL.
*   **Tier 3: Hexagon DSP**: Prioritize NPU acceleration via the QNN backend, as the Adreno 702 is fundamentally too weak for LLM workloads using non-optimized drivers.
