# Sensai Evaluation — Vulkan GPU Results (v1)

**Date:** 2026-05-08
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702)
**Software:** `llama.cpp` (Patched Vulkan Lite) + Matrix Core Stubbing
**Model:** Qwen3.5-0.8B-Q4_0.gguf
**Configuration**: `-t 2`, `-fa 0`, `-ngl 999` (Target) / `-ngl 1` (Current Stable)

---

## 1. Objective
To evaluate the performance and stability of the "Vulkan Lite" implementation on the Adreno 702, using the standard evaluation parameters (pp35, tg100).

---

## 2. Benchmark Results

### Performance Matrix (Current Best Stable)

| Metric | CPU Baseline (-t 4) | OpenCL (Wang, -ngl 1) | Vulkan Lite (-ngl 1) |
| :--- | :--- | :--- | :--- |
| **Prompt Tokens** | 35 | 35 | 35 |
| **Completion Tokens** | 100 | 100 | 100 |
| **Prefill Speed** | **8.1 t/s** | 4.43 t/s | 1.00 t/s |
| **Generation Speed** | **3.2 t/s** | 2.67 t/s | (In Progress) |

### Status: **RESEARCH PATH ACTIVE**
Full offloading (`-ngl 999`) on the Adreno 702 triggers a Mesa driver constraint:
`MESA: error: Compute shader ((null)) which has workgroup barrier cannot be used because it's impossible to have enough concurrent waves.`

This indicates that while the **16KB shared memory wall** was bypassed by our tile-size reduction, the Adreno 702's single Compute Unit is now hitting a **wave concurrency limit** when executing the complex matmul kernels required for full model offloading.

---

## 3. Engineering Analysis

### 3.1. Shared Memory vs. Wave Occupancy
- **Success**: The `s_warptile` forcing successfully bypassed the "Shared memory size too small" error.
- **New Blocker**: The Turnip driver requires a minimum number of concurrent waves to satisfy workgroup barriers. On a single-CU device like the FD702, large workgroups (even with small shared memory) cannot be scheduled concurrently.

### 3.2. Comparison with OpenCL
- The OpenCL path (Wang) remains faster and more stable for `-ngl 1` because it uses a simpler kernel architecture that doesn't rely on the same Vulkan-specific occupancy rules.
- However, the Vulkan path provides superior **driver visibility** (subgroups) and is the target for long-term Mesa driver improvements.

---

## 4. Final Recommendation (Vulkan v1)

For immediate production use on the Uno Q, the **CPU path remains the primary target**. 

The **Vulkan Lite** path has achieved its primary goal: **functional model loading and partial execution without crashes.** It serves as the foundation for future optimizations (e.g., further shrinking workgroup sizes to fit single-wave execution) on the Adreno GPU.

---
*This document is part of the Sensai Documentation Suite.*
