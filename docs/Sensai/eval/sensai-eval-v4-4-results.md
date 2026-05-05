# Sensai Evaluation — v4.4 Results (Final Adreno 702 Benchmark)

**Date:** 2026-05-05
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702)
**Software:** `llama.cpp` (Wang's `opencl/nvidia` branch) + Dynamic Optimizations
**Model:** Qwen3.5-0.8B-Q4_0.gguf
**Configuration**: `--reasoning off` (Thinking=0), `-t 2`, `-ngl 1` (Stable Baseline)

---

## 1. Objective
To evaluate the Adreno 702 GPU inference generation speed in the same manner as the CPU baseline, using the standard Sensai "Breathing LED" prompt and the optimized `llama-server`.

---

## 2. Benchmark Results

### Performance Matrix

| Metric | CPU Baseline (-t 4) | GPU (Optimized, -ngl 1) | Delta |
| :--- | :--- | :--- | :--- |
| **Prompt Tokens** | 35 | 35 | - |
| **Completion Tokens** | 100 | 100 | - |
| **Prefill Speed** | **8.1 t/s** | 4.43 t/s | -45% |
| **Generation Speed** | **3.2 t/s** | 2.67 t/s | -16% |

### Quality Verification
*   **Prompt**: *"Write a sketch that fades an LED on pin 9 in and out like breathing, then explain how it works."*
*   **Result**: The model produced a descriptive response. Due to the 0.8B parameter limit and low temperature, the code structure followed the canonical patterns established in SOUL.md.
*   **Thinking Mode**: Confirmed **DISABLED** (`thinking = 0`) via `--reasoning off`.

---

## 3. Technical Analysis

### GPU vs CPU Reality
While the Adreno 702 is now functionally unblocked and stable for inference, the hardware ceiling of **1 Compute Unit (CU)** makes it slower than the **4× Cortex-A53 CPU cores** for this specific model size.
1.  **Memory Bandwidth**: Both GPU and CPU share the same LPDDR4X bus. GPU offloading adds kernel dispatch overhead without increasing raw bandwidth.
2.  **TDR Limits**: Full offloading (`-ngl 999`) frequently triggers GPU Watchdog Timeouts (TDR) during the complex "Decode" graph pass, even when the "Prefill" pass succeeds.
3.  **Kernel Complexity**: The "No-Subgroups Compatibility" mode required for Mesa/RustiCL increases the compute load per token compared to native subgroup instructions.

---

## 4. Final Project Conclusion (OpenCL Path)

The OpenCL acceleration path for the Arduino Uno Q is now **Feature Complete**. 
*   We have resolved the model loading crashes (SOA Fix).
*   We have resolved the math errors (Proportional Scaling Fix).
*   We have achieved end-to-end stability for real-world requests.

### Recommendation
For the Arduino Uno Q (QRB2210), the **CPU remains the recommended production target** for token generation speed. The GPU's primary value on this platform is as a research vehicle for understanding Mesa's driver maturation. Future work should focus on the **Hexagon NPU** for significant performance gains.
