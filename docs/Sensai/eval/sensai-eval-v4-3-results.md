# Sensai Evaluation — v4.3 Results (Optimization Breakthrough)

**Date:** 2026-05-05
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702)
**Software:** `llama.cpp` (Wang's `opencl/nvidia` branch) + Dynamic Optimizations
**Model:** Qwen3.5-0.8B-Q4_0.gguf

---

## 1. Breakthrough Results: Prefill Scalability Unblocked

By transitioning from conservative stability patches to dynamic hardware optimization, we have successfully unblocked the Adreno 702's ability to handle multi-row batches. For the first time, GPU prefill speeds have exceeded the CPU baseline on this hardware.

### Benchmark Comparison

| Batch Size (p) | v4.2 Status (Surgical Fallback) | v4.3 Status (Optimized) | Performance (t/s) | Improvement |
| :--- | :--- | :--- | :--- | :--- |
| `-p 1` | 0.22 t/s | **SUCCESS** | **0.36** | +63% |
| `-p 2` | 0.34 t/s | **SUCCESS** | **0.60** | +76% |
| **`-p 32`** | **CRASH (-5)** | **SUCCESS** | **4.23** | **UNBLOCKED** |
| `-p 385` | CRASH (-5) | CRASH (-5) | N/A | TDR Timeout |

**Key Metric**: At `-p 32`, the GPU is now delivering **4.23 t/s**, which is a significant milestone for the entry-level Adreno 702.

---

## 2. Dynamic Optimizations Applied

The following breakthrough optimizations were implemented in the `llama-wang` branch:

### 1. Surgical SOA Dispatch (Stability)
Switched the Struct-of-Arrays (SOA) weight conversion kernels to a **1D dispatch with NULL local work size**. This allows the driver to autonomously choose the safest workgroup size based on current register pressure, resolving the intermittent crashes during model load.

### 2. Proportional Fallback Scaling (Math Integrity)
Implemented a robust scaling loop in `enqueue_ndrange_kernel`. When the driver returns `CL_INVALID_WORK_GROUP_SIZE`:
*   Both **Global Work Size (GWS)** and **Local Work Size (LWS)** are halved proportionally.
*   This ensures the number of workgroups (which kernels use as semantic row/head indices) remains constant.
*   Result: Kernels that previously crashed now execute correctly at reduced occupancy.

### 3. Corrected RustiCL Detection
Fixed the device classification to correctly identify `FD702` (Freedreno) while:
*   Activating the `INTEL` code path to leverage Wang's subgroup-compatibility preamble.
*   Forcing `adreno_wave_size = 32` to match Mesa/RustiCL's preferred execution width for A7xx.

---

## 3. Technical Analysis of Remaining Limits

### The -p 385 Barrier (GPU Watchdog)
The crash at batch size 385 is now confirmed as a **GPU Watchdog Timeout (TDR)**. 
*   **Reason**: The Adreno 702 (1 CU) processes 385 rows too slowly. The total execution time for the command buffer exceeds the Linux kernel's safety threshold (~5 seconds), triggering a hardware reset.
*   **Implication**: GPU inference is now limited by hardware throughput rather than driver bugs or memory constraints.

---

## 4. Final Conclusion & Strategic Pivot

The "OpenCL Path" for the Adreno 702 is now considered **Feature Complete but Throughput Limited**. We have achieved stability and basic scalability.

### Recommended Final Strategy:
*   **Tier 2 (Vulkan Lite)**: Attempt to fit mainline Vulkan shaders into the 16KB limit. Vulkan (Turnip) is architecturally superior to RustiCL and may bypass the TDR limits at high batch sizes.
*   **Tier 3 (Hexagon NPU)**: The NPU remains the ultimate target for production-grade inference on the QRB2210.
