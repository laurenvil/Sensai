# Analysis: Wave Concurrency Limits on Adreno 702
**Diagnosing and Patching the "Impossible Concurrent Waves" Error**

**Date:** May 8, 2026  
**Hardware:** Arduino Uno Q (Adreno 702)  
**Driver:** Mesa Turnip (v24.x)  
**Status:** Root Cause Identified; Patch Proposed

---

## 1. The Symptom

During full model offloading (`-ngl 999`), the Mesa Turnip driver terminates the process with the following error:
> `MESA: error: Compute shader ((null)) which has workgroup barrier cannot be used because it's impossible to have enough concurrent waves.`

This error is unique to Vulkan; it did not appear in the OpenCL path because OpenCL's compiler (RustiCL) handles occupancy checks differently or uses simpler kernel architectures.

## 2. Technical Root Cause

### 2.1. Workgroup Residency Requirement
In Vulkan, a **workgroup barrier** (`controlBarrier`) requires that all threads in a workgroup reach the barrier before any can proceed. For this to work, the hardware must be able to fit the **entire workgroup** on a single Shader Processor (Compute Unit) simultaneously.

### 2.2. Wave Occupancy Calculation
Adreno GPUs divide workgroups into "waves" (subgroups), which on the A702 are **32 threads** wide.
- If a shader defines `BLOCK_SIZE 512`, it requires **16 concurrent waves**.
- If a shader defines `BLOCK_SIZE 1024`, it requires **32 concurrent waves**.

The IR3 compiler (Mesa Adreno backend) calculates the maximum possible waves based on **Register Pressure**, **Shared Memory**, and **Branchstack** depth. If the required occupancy exceeds the hardware's capacity, the compiler errors out to prevent a permanent GPU hang.

### 2.3. The Adreno 702 Ceiling
The A702 is an entry-level GPU with **only 1 Compute Unit (CU)**. 
- **Mainline Shaders:** `llama.cpp` hardcodes `BLOCK_SIZE 512` in several reduction shaders (`norm.comp`, `rms_norm.comp`).
- **Conflict:** At 512 threads, the A702's register file cannot accommodate all 16 waves simultaneously while executing the complex logic of `rms_norm`. 

## 3. Why `-ngl 1` works while `-ngl 999` fails

The `ngl` parameter determines how many layers are processed on the GPU.
- **`-ngl 1`:** Only the first layer is offloaded. The **Normalization** step between layer 0 and layer 1 occurs on the **CPU**. Since the faulty `rms_norm.comp` is not triggered, the program runs.
- **`-ngl 2+`:** The output of layer 0 stays on the GPU for layer 1's input normalization. This forces the use of the **GPU RMS Norm shader**, which hits the wave concurrency limit and crashes.

**Note:** Decreasing `-ngl` to 99 or 24 makes no difference, as the model only has ~24 layers. Any value $>1$ triggers the intermediate GPU normalization.

## 4. Proposed "Vulkan Lite Phase 2" Patch

To achieve full offloading on the A702, we must refactor the reduction shaders to use smaller workgroups.

### 4.1. Patching `rms_norm.comp` and `norm.comp`
Change the hardcoded `BLOCK_SIZE` from 512 to **32** (or 64).
```glsl
// OLD
#define BLOCK_SIZE 512
// NEW
#define BLOCK_SIZE 32
```
**Why this works:**
- A `BLOCK_SIZE` of 32 corresponds to **exactly 1 wave** on the A702.
- 1 wave always fits (it is the minimum unit of execution).
- The `barrier()` requirement is trivially satisfied.
- The existing loop logic (`col += BLOCK_SIZE`) in these shaders already handles arbitrary tensor widths, so no math changes are required.

### 4.2. Patching `soft_max.comp`
Similar to Norm, `soft_max.comp` uses a configurable `BLOCK_SIZE` via specialization constants. We must ensure the host code (`ggml-vulkan.cpp`) sets this to 32 for the Adreno 702.

## 5. Conclusion

The "Vulkan Lite" implementation successfully bypassed the Shared Memory wall, but hit a second "Occupancy Wall." By shrinking the workgroup sizes in the reduction kernels, we can satisfy the A702's residency requirements and unlock full 999-layer GPU acceleration.

---
*This document is part of the Sensai Engineering Suite.*
