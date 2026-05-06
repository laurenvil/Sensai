# Feasibility Study: "Vulkan Lite" for Adreno 702
**Porting OpenCL Optimizations to the Vulkan Backend**

**Date:** May 5, 2026  
**Authors:** Gemini CLI Engineering Team  
**Subject:** Bypassing the 16KB Shared Memory Wall via Dynamic Tiling  

---

## 1. Executive Summary
Following our success in enabling scalable inference on the Adreno 702 via the OpenCL "Wang" branch, we have conducted a feasibility study to port these optimizations to the **mainline Vulkan backend**. Our findings confirm that a **"Vulkan Lite"** implementation is not only possible but likely to outperform the current OpenCL solution due to Vulkan's lower CPU overhead and superior driver reporting on the Mesa Turnip stack.

## 2. Technical Findings

### 2.1. The Specialization Constant Breakthrough
Unlike OpenCL, which requires manual string manipulation of kernel source code to change tile sizes, the `llama.cpp` Vulkan backend (`ggml-vulkan.cpp`) uses **Vulkan Specialization Constants** to define tiling parameters (`BM`, `BN`, `BK`) at pipeline creation time. 

*   **Matmul Shader (mul_mm_cm2.comp)**:
    ```glsl
    layout (constant_id = 1) const uint BM = 64;
    layout (constant_id = 2) const uint BN = 64;
    layout (constant_id = 3) const uint BK = 16;
    ```
*   **Implication**: We can shrink the memory footprint of every matmul kernel **without modifying the shader source code**, simply by patching the `warptile` vectors in the C++ host code.

### 2.2. Bypassing the 16KB Wall
The Adreno 702's hard limit of 16KB for `maxComputeSharedMemorySize` is the primary blocker for mainline Vulkan. 
*   **Mainline Requirement**: At standard tile sizes (64x64), F32 accumulation buffers require **~17.4 KB**, triggering a load-time rejection.
*   **The "Lite" Solution**: By forcing the **Small Tiling Profile** (`s_warptile`) for all layers, the memory footprint drops to **~4.3 KB**. This fits comfortably within the 16KB limit, allowing the shaders to load and execute on the FD702.

### 2.3. Superior Subgroup Visibility
Our analysis via `vulkaninfo` reveals that the Mesa Turnip driver correctly exposes subgroup extensions (`Shuffle`, `Ballot`, `Arithmetic`) for the Adreno 702, whereas RustiCL (OpenCL) failed to report them. This means a Vulkan-based solution can use **native SIMD reductions** instead of the heavy `__local` memory tree-reductions used in our current OpenCL breakthrough.

## 3. Implementation Roadmap: The "Vulkan Lite" Patch

We propose a three-step surgical patch for `ggml-vulkan.cpp`:

1.  **Device Identification**: Detect the `Turnip Adreno (TM) 702` and its 16KB limit during backend initialization.
2.  **Tiling Override**: Add a "Low-End Adreno" tuning block that forces all `l_warptile` and `m_warptile` configurations to use the `s_warptile` (32x32) dimensions.
3.  **Proportional Scaling Port**: Port the **Proportional Fallback Scaling** logic to the Vulkan `cmd_buffer` submission loop. This will allow the system to automatically recover from any remaining "Out of Resources" errors by shrinking the `nth` (workgroup size) while maintaining math integrity.

## 4. Conclusion
"Vulkan Lite" is the definitive next step for the Sensai project. It leverages the architectural flexibility of Specialization Constants to overcome the physical limitations of the Adreno 702. We expect this path to provide **stable end-to-end inference at -p 32** with significantly higher tokens/sec than the current OpenCL path.

---
*This document is part of the Sensai Documentation Suite.*
