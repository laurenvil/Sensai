# Strategy: LLM Inference on Hexagon DSP (HVX) for Sensai

## 1. Overview: The Bandwidth vs. Compute Challenge

The Arduino Uno Q (QRB2210) faces a dual-bottleneck for LLM inference:
1.  **Memory Bandwidth:** LPDDR4X is orders of magnitude slower than the Hexagon DSP's internal compute capacity.
2.  **Architectural Gap:** The 6th Gen Hexagon DSP (v66-equivalent) lacks the dedicated Matrix Extensions (HMX/HTP) found in newer Snapdragon chips, relying instead on **Hexagon Vector eXtensions (HVX)** for INT8/INT16 math.

To achieve viable inference speeds with our Qwen model, we must shift from a "compute-bound" mindset to a "bandwidth-saving" one.

## 2. Core Strategies for Implementation

### 2.1. Extreme Quantization (Weight-Only)
Since the LPDDR4X bus is the bottleneck, we must minimize the data transferred per token.
*   **INT4/INT2 Weight Quantization:** Store model weights in 4-bit or even 2-bit formats in main memory.
*   **On-the-fly De-quantization:** Move INT4 weights into the DSP's **VTCM (Virtual Tightly Coupled Memory)** and de-quantize them to INT8/FP16 just-in-time for HVX vector multiplication. This ensures the bottleneck (the bus) only carries a fraction of the payload.
*   **Tooling:** Use the **Qualcomm AI Model Efficiency Toolkit (AIMET)** for Post-Training Quantization (PTQ) to find the optimal balance between accuracy and compression.

### 2.2. Memory Hierarchy Management (VTCM & DMA)
The Hexagon DSP has a small but extremely fast VTCM (typically 1MB-4MB).
*   **VTCM Tiling:** Divide the Qwen weight matrices into tiles that fit within the VTCM.
*   **Double Buffering (DMA Overlap):** Use the Hexagon DMA engine to prefetch the next tile from LPDDR4X into VTCM *while* the HVX units are computing the current tile. This hides memory latency behind compute time.
*   **L2 Cache Management:** Use `l2_fetch` hints via the Hexagon SDK to keep frequently used data (like the KV cache) in the L2 cache.

### 2.3. HVX-Optimized Kernels
Standard C/C++ code will not leverage the DSP's power. We must use **Hexagon Intrinsics**.
*   **Custom GEMV Kernels:** Implement General Matrix-Vector (GEMV) multiplication using 1024-bit HVX SIMD instructions.
*   **Operator Fusion:** Combine `RMSNorm`, `RoPE` (Rotary Positional Embeddings), and `SwiGLU` activation into single HVX kernels to prevent intermediate data from being written back to slow LPDDR4X memory.

## 3. Targeted Patches and Community Projects

We will leverage and adapt the following efforts to our Sensai environment:

1.  **llama.cpp-npu (Zhouwg/Chraac):**
    *   **Strategy:** This community project implements custom GGML kernels for Hexagon. 
    *   **Patch:** We can port the HVX-optimized `MUL_MAT` and `RMS_NORM` kernels to support the older v66-tier DSP on the QRB2210.
    *   **Benefit:** Allows direct control over the 4GB virtual address space limit and provides a blueprint for multi-session inference.

2.  **Apache TVM (Hexagon Backend):**
    *   **Strategy:** TVM's Hexagon target (`-mcpu=v66`) includes mature support for VTCM tiling and double-buffering.
    *   **Patch:** Use TVM's **AutoTIR** to automatically generate and tune HVX kernels for Qwen's specific layer shapes. This is often more efficient than manual intrinsic programming.

3.  **Qualcomm QNN (DSP Backend):**
    *   **Strategy:** While the QNN "HTP" backend is for newer chips, the "DSP" backend supports the Uno Q.
    *   **Patch:** Implement the LLM's dynamic KV cache using QNN's **User-Defined Operations (UDOs)** to bypass the static graph limitations.

## 4. Implementation Roadmap for Qwen

1.  **Phase A (Quantization):** Quantize the Qwen 1.8B/4B model to **4-bit GGUF** and evaluate the accuracy floor.
2.  **Phase B (Kernel Porting):** Adapt the `llama.cpp` Hexagon HVX kernels for the v66 DSP. Focus initially on the `matmul` operation, as it consumes ~90% of inference time.
3.  **Phase C (Integration):** Integrate the optimized kernels into the `yzma` bridge. Use the `ADSP_LIBRARY_PATH` to load our custom `.so` files onto the Hexagon DSP at runtime.
4.  **Phase D (Validation):** Benchmark tokens-per-second (t/s) against the current CPU-only baseline. Our target is >2 t/s on the Uno Q DSP.

## 5. Conclusion
Getting LLMs working on the Uno Q's Hexagon DSP is a race against memory bandwidth. By using **4-bit weight-only quantization** and **DMA-accelerated VTCM tiling**, we can effectively "widen" the LPDDR4X bottleneck. While the Uno Q will never match the NPU performance of the upcoming Ventuno Q, these strategies provide a viable path for real-time, on-device AI for current Sensai users.
