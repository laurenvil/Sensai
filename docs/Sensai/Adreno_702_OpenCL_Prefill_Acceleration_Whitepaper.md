TECHNICAL WHITEPAPER
**Adreno 702 OpenCL Prefill Acceleration**
Reducing Time-to-First-Token for Qwen3-0.6B
via Yzma on Arduino Uno Q (4 GB)

Target Hardware: Qualcomm Dragonwing QRB2210 SoC
GPU: Adreno 702 @ 845 MHz  |  OpenCL 2.0  |  Vulkan 1.1
Software: Yzma (hybridgroup) + llama.cpp OpenCL Backend

March 2026
*Classification: Engineering Reference*

# 1. Executive Summary

This whitepaper provides a complete implementation guide for enabling GPU-accelerated prompt processing (prefill) on the Arduino Uno Q using the Adreno 702's OpenCL 2.0 compute path. The goal is to reduce time-to-first-token (TTFT) from the current **~28 seconds** (CPU-only Ollama baseline with TinyLlama) to under **10 seconds** for Qwen3-0.6B at Q4_0 quantization, using Yzma as the Go application framework.
The approach involves building a custom libllama.so shared library with the llama.cpp OpenCL backend enabled, configuring it with Qualcomm's Adreno-optimized kernels, and hot-swapping this library into Yzma's FFI loading path. This is the single highest-impact optimization available on this hardware, because prefill (prompt processing) is *compute-bound* and the Adreno 702 delivers an estimated 5–13× more FP16/INT8 throughput than the four Cortex-A53 CPU cores.
A critical caveat: decode (token generation) speed will **not** improve from GPU offload because it is memory-bandwidth-bound, and the GPU shares the same ~3.5 GB/s LPDDR4X bus. The improvement is exclusively in TTFT and prompt throughput.

# 2. Hardware Foundation: The Adreno 702 Compute Profile

## 2.1 SoC Architecture

The Arduino Uno Q uses the Qualcomm Dragonwing QRB2210 SoC. The Adreno 702 GPU within it operates at 845 MHz and is classified as an A6xx-family GPU in the Mesa/freedreno open-source driver stack. Linux kernel patches by Konrad Dybcio at Linaro added A702 support under the a6xx driver code path, and the corresponding Mesa merge request (MR !27665) enables userland graphics support.

| **Parameter** | **Specification** | **Inference Impact** |
| --- | --- | --- |
| **GPU Model** | **Adreno 702 (A6xx family)** | **Uses a6xx register layout** |
| **Clock Frequency** | **845 MHz** | **Fixed; no dynamic boost** |
| **Shader Processors** | **~1 SP (est. 48–128 ALUs)** | **Low parallelism ceiling** |
| **FP16 Throughput (est.)** | **~50–100 GFLOPS** | **5–13× over A53 CPU** |
| **OpenCL Version** | **2.0** | **Meets backend requirement** |
| **Vulkan Version** | **1.1** | **Alternate backend (not recommended)** |
| **Memory Interface** | **Shared LPDDR4X, ~14.4 GB/s peak** | **UMA; zero-copy possible** |
| **GMEM (On-chip)** | **~128–256 KB (est.)** | **Tile-mode cache for render** |
| **SVM Support** | **Coarse-grain buffer (expected)** | **Critical for zero-copy** |
| **Driver Stack** | **Qualcomm proprietary + Mesa freedreno** | **Proprietary needed for OpenCL** |

## 2.2 Why OpenCL, Not Vulkan

The llama.cpp Vulkan backend, while mature on desktop GPUs, has documented problems on Adreno hardware. Community reports include shader compilation bugs on A6xx GPUs, segfaults during inference, and performance regressions where Vulkan was slower than CPU-only execution. The llama.cpp OPENCL.md documentation explicitly states that the OpenCL backend was designed for Adreno GPUs first, and Qualcomm's GPU Research Team contributed over 50 custom-optimized kernels specifically tuned for Adreno architectures.
The OpenCL backend supports A6xx GPUs with recent drivers and compilers, typically found on IoT platforms. The Arduino Uno Q, running Debian with kernel v6.16 and Qualcomm's proprietary OpenCL ICD, is precisely this use case. Phone-based A6xx GPUs with outdated drivers are explicitly noted as unsupported, but IoT boards with vendor-supplied drivers are the primary target.

## 2.3 The A702 Classification Problem

Despite its "700" branding, the Adreno 702 is architecturally an A6xx GPU. The kernel DRM driver code path is a6xx_gpu.c, and the register definitions come from a6xx.xml. This is a distinct GPU from the flagship A730/A740/A750 (true A7xx parts with different SP configurations, hardware ray-tracing, and concurrent binning). The A702 is a cost-optimized derivative designed for IoT/wearable SoCs, sharing the A6xx instruction set and memory architecture with simplified shader core configurations.
This classification has a direct consequence: the llama.cpp OpenCL backend's Adreno-optimized kernels were tuned for premium A7xx and A8xx GPUs (verified on Adreno 750, 830, X85). The A702 will run these kernels, but they may not achieve optimal occupancy or memory access patterns on the A702's reduced shader core count. Performance validation is required, and kernel-level tuning may be needed.

# 3. Why GPU Offload Accelerates Prefill But Not Decode

## 3.1 The Compute vs. Bandwidth Dichotomy

LLM inference has two distinct phases with fundamentally different computational profiles. Understanding this distinction is essential to setting realistic expectations for the GPU offload effort.

| **Phase** | **Operation** | **Bottleneck** | **GPU Benefit** |
| --- | --- | --- | --- |
| **Prefill (prompt processing)** | **Parallel matrix multiplication over all prompt tokens simultaneously** | **Compute-bound (FLOPS)** | **HIGH: 5–13× speedup expected** |
| **Decode (token generation)** | **Sequential: read all weights once per token, generate one token** | **Memory bandwidth (~3.5 GB/s)** | **NONE: GPU shares the same DRAM bus** |

## 3.2 Prefill Arithmetic for Qwen3-0.6B

Qwen3-0.6B has 596 million parameters across 28 transformer layers (hidden_size=1024, intermediate_size=3072, 16 query heads with 8 KV heads). For a 256-token prompt at Q4_0 quantization, the prefill computation involves approximately:
**~300 billion INT4×FP16 multiply-accumulate operations** (factoring in attention, MLP, and layer norm across all 28 layers). On the four Cortex-A53 cores at ~16 GFLOPS aggregate FP16 throughput, this takes approximately **18–20 seconds**. On the Adreno 702 at an estimated 50–100 GFLOPS effective throughput, the same computation should complete in **3–6 seconds**, with additional overhead for kernel launch, memory staging, and CPU-GPU synchronization adding 1–3 seconds. Total estimated TTFT: **4–9 seconds** versus the current 28-second baseline.

## 3.3 Decode Remains Unchanged

Token generation requires reading the full model weights (~340 MB for Q4_0) from DRAM for each token. At ~3.5 GB/s effective read bandwidth, this yields a hard ceiling of ~10.3 tok/s regardless of whether the CPU or GPU performs the reads. The Adreno 702 accesses the *same LPDDR4X memory bus* as the CPU. GPU offload for decode does not create new bandwidth — it merely changes which processor is bottlenecked by the same DRAM interface. Expected decode: **8–12 tok/s** (unchanged from CPU-only optimized baseline).

# 4. The llama.cpp OpenCL Backend: Architecture and Adreno Optimizations

## 4.1 Backend Design

The OpenCL backend was developed by Qualcomm's GPU Research Team and upstreamed via CodeLinaro to mainline llama.cpp. It implements over 50 custom OpenCL kernels covering the core tensor operations required for transformer inference: quantized matrix multiplication (GEMM/GEMV), softmax, RMS normalization, RoPE position encoding, element-wise operations, and attention computation.
Unlike the deprecated CLBlast-based OpenCL backend (which only offloaded MatMul via generic BLAS), the new backend offloads the entire inference graph to the GPU when all layers are assigned via -ngl. The host (CPU) side handles only tokenization, sampling, and orchestration.

## 4.2 Adreno-Specific Kernel Optimizations

When built with GGML_OPENCL_USE_ADRENO_KERNELS=ON (the default), the backend activates Adreno-specific code paths that exploit architectural features of Qualcomm GPUs:
**Struct-of-Arrays (SOA) weight layout: **Quantized weights are flattened from the standard interleaved format to a SOA representation (GGML_OPENCL_SOA_Q). This improves memory coalescing on Adreno's load/store units, which prefer stride-1 access patterns across work items within a wavefront.
**Subgroup broadcast operations: **The backend checks for vector subgroup broadcast support and uses cl_khr_subgroup_ballot/shuffle extensions to perform warp-level reductions without shared memory. This eliminates bank conflicts in softmax and reduction operations.
**FP16 compute with FP32 accumulation: **Matrix multiplications use FP16 operands with FP32 accumulators, matching Adreno's native mixed-precision execution units. The integer dot-product extension (cl_qcom_dot_product_8bit_integer) is used where available for Q4_0×Q8_0 inner products.
**SVM (Shared Virtual Memory) for zero-copy: **On Adreno GPUs that support SVM coarse-grain buffers, model weights and KV cache are mapped into GPU-accessible virtual memory without explicit host↔device copies. This is critical for UMA (Unified Memory Architecture) SoCs like the QRB2210, where CPU and GPU share the same physical DRAM. An earlier community analysis showed that using CL_MEM_ALLOC_HOST_PTR instead of copy-based buffer creation yielded a 13.6× speedup on shared-memory SoCs.
**On-chip global memory: **Adreno GPUs feature on-chip GMEM that can be used as a programmer-managed cache. Qualcomm's SDK exposes this via vendor extensions, and the backend leverages it for attention tile storage when possible. On the A702, GMEM is estimated at 128–256 KB, sufficient for single-head attention tiles at short context lengths.

## 4.3 Supported Quantization Formats

The OpenCL backend has optimized kernels for the following quantization types, in order of performance:

| **Format** | **Status** | **Notes for Adreno 702** |
| --- | --- | --- |
| **Q4_0 (pure)** | **Fully optimized** | **REQUIRED for best performance; use --pure flag** |
| **Q8_0** | **Supported** | **Larger model size reduces bandwidth-limited decode** |
| **Q6_K** | **Supported, not optimized** | **Mixed-quant; slower kernel dispatch** |
| **MXFP4** | **Supported** | **Primarily for MoE models** |

The documentation explicitly recommends using --pure Q4_0 quantization for Adreno: this ensures all weight tensors use the Q4_0 format (no mixed quantization), which allows the backend to use a single optimized kernel path without per-tensor format dispatch overhead.

## 4.4 Known Issues and Risk Assessment

The following known issues apply to this implementation:

| **Issue** | **Severity** | **Mitigation** |
| --- | --- | --- |
| **A6xx IoT support stated but A702 not verified** | **MEDIUM** | **Build and test; fall back to CPU-only if OpenCL init fails** |
| **Flash attention does not always improve perf** | **LOW** | **Disable with --no-flash-attn if regressions observed** |
| **Builds after b5028 may cause segfault (reported Apr 2025)** | **MEDIUM** | **Pin to b5028 or earlier release tag for initial validation** |
| **Adreno 610 (also A6xx) reported as non-functional** | **HIGH (cautionary)** | **A610 is in phones with old drivers; IoT boards have newer drivers** |
| **OpenCL backend is actively developed; API may change** | **LOW** | **Pin llama.cpp commit hash in build scripts** |

# 5. Step-by-Step Implementation Guide

*All commands are executed on the Arduino Uno Q (4 GB variant) via SSH or serial console. The board runs Debian Trixie with kernel v6.16.*

## 5.1 Phase 1: Verify OpenCL Runtime Availability

Before building anything, confirm that the Qualcomm OpenCL ICD is present and functional on the board's Debian installation:
# Check for OpenCL ICD libraries
ls -la /vendor/lib64/libOpenCL* 2>/dev/null
ls -la /usr/lib/aarch64-linux-gnu/libOpenCL* 2>/dev/null
find / -name 'libOpenCL*' 2>/dev/null

# If clinfo is available:
sudo apt install -y clinfo
clinfo

# Expected output should show:
#   Platform Name: QUALCOMM Snapdragon(TM)
#   Device Name:   QUALCOMM Adreno(TM) 702
#   OpenCL Version: OpenCL 2.0 ...

**If no OpenCL platform is found: **The Qualcomm proprietary OpenCL driver may not be installed in the default Debian image. Check if libOpenCL_adreno.so exists in /vendor/lib64/ or similar vendor partition. If present but not detected, create the ICD loader configuration:
sudo mkdir -p /etc/OpenCL/vendors
echo '/vendor/lib64/libOpenCL_adreno.so' | \
sudo tee /etc/OpenCL/vendors/qualcomm.icd
export LD_LIBRARY_PATH=/vendor/lib64:$LD_LIBRARY_PATH

If the proprietary driver is absent entirely, GPU compute is not available and the board is CPU-only. Contact Arduino/Qualcomm support or check for updated BSP images that include the OpenCL ICD.

## 5.2 Phase 2: Install Build Dependencies

sudo apt update && sudo apt install -y \
git build-essential cmake ninja-build \
libcurl4-openssl-dev pkg-config \
ocl-icd-libopencl1 ocl-icd-opencl-dev \
opencl-headers golang-go

# Verify cmake version >= 3.29
cmake --version

Note: The ocl-icd-libopencl1 package provides the ICD Loader that dynamically dispatches OpenCL calls to the vendor driver (Qualcomm's libOpenCL_adreno.so). The opencl-headers package provides the CL/cl.h headers needed for compilation. If the Debian repository version of opencl-headers is too old (< OpenCL 2.0), build from source via the Khronos OpenCL-Headers repository.

## 5.3 Phase 3: Build llama.cpp with OpenCL + Adreno Kernels

This is the core build step. We compile llama.cpp as a shared library (libllama.so) with the OpenCL backend enabled and Adreno-optimized kernels embedded:
cd ~ && mkdir -p dev/llm && cd dev/llm

# Clone llama.cpp (pin to a known-good release)
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
git checkout b5028  # Last verified stable for OpenCL

# Build with OpenCL + Adreno optimizations
cmake -B build-opencl -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_OPENCL=ON \
-DGGML_OPENCL_EMBED_KERNELS=ON \
-DGGML_OPENCL_USE_ADRENO_KERNELS=ON \
-DGGML_NATIVE=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto'

cmake --build build-opencl -j4

Build flag rationale:

| **Flag** | **Purpose** |
| --- | --- |
| **BUILD_SHARED_LIBS=ON** | **Produces libllama.so + libggml.so for Yzma FFI loading** |
| **GGML_OPENCL=ON** | **Enables the OpenCL compute backend** |
| **GGML_OPENCL_EMBED_KERNELS=ON** | **Embeds .cl kernel source into the binary (no runtime file loading)** |
| **GGML_OPENCL_USE_ADRENO_KERNELS=ON** | **Activates 50+ Adreno-optimized OpenCL kernels** |
| **GGML_NATIVE=ON** | **Enables -march=native for CPU fallback code paths** |
| **-mcpu=cortex-a53+crypto** | **A53-specific instruction scheduling + AES/SHA crypto extensions** |

## 5.4 Phase 4: Validate the OpenCL Build

After compilation, verify that the OpenCL backend was linked correctly and can detect the Adreno 702:
# Check that libllama.so links against OpenCL
ldd build-opencl/bin/libllama.so | grep -i opencl
# Expected: libOpenCL.so.1 => /usr/lib/...libOpenCL.so.1

# Quick smoke test with a tiny model
# First, download a small test model
wget -q https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/\
resolve/main/tinyllama-1.1b-chat-v1.0.Q4_0.gguf

# Run with GPU layers enabled
build-opencl/bin/llama-cli \
-m tinyllama-1.1b-chat-v1.0.Q4_0.gguf \
-p 'Hello' -n 5 -ngl 99 2>&1 | head -30

# Look for OpenCL initialization messages:
#   ggml_opencl: selecting platform: 'QUALCOMM Snapdragon(TM)'
#   ggml_opencl: selecting device: 'QUALCOMM Adreno(TM) 702'
#   ggml_opencl: OpenCL driver: OpenCL 2.0 QUALCOMM ...
#   ggml_opencl: using kernels optimized for Adreno

**If the A702 is not detected or init crashes: **This confirms the A702 lacks the required driver extensions. Fall back to CPU-only build (Phase 7 contingency). If the device is detected but inference segfaults, try building without Adreno kernels (GGML_OPENCL_USE_ADRENO_KERNELS=OFF) to use the generic OpenCL path, which may be more compatible but slower.

## 5.5 Phase 5: Prepare Qwen3-0.6B with Pure Q4_0 Quantization

The OpenCL backend requires **pure Q4_0 quantization** for optimal Adreno performance. Standard Q4_0 quantization from Hugging Face may use mixed formats (Q4_0 for most layers, Q6_K for attention output). We need all weights in Q4_0:
# Option A: Download pre-quantized Q4_0 from Qwen official
wget https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/\
qwen3-0.6b-q4_0.gguf

# Option B: Re-quantize with --pure for all-Q4_0
# (requires F16 GGUF source or safetensors conversion)
build-opencl/bin/llama-quantize --pure \
qwen3-0.6b-f16.gguf \
qwen3-0.6b-q4_0-pure.gguf Q4_0

The --pure flag ensures every tensor (including embedding, output, and layer norm weights that are normally kept at higher precision) is quantized to Q4_0. This eliminates the need for the backend to dispatch between different dequantization kernels, reducing kernel launch overhead and improving GPU occupancy.

## 5.6 Phase 6: Integrate with Yzma via Library Replacement

Yzma loads llama.cpp as shared libraries via FFI. The key insight is that Yzma does not care how libllama.so was built — it only requires that the shared library exports the expected C API symbols. By replacing the generic CPU prebuilt with our OpenCL-enabled build, Yzma automatically gains GPU acceleration:
# Install Yzma CLI
go install github.com/hybridgroup/yzma/cmd/yzma@latest

# Create library directory
mkdir -p ~/yzma-lib

# Copy our OpenCL-enabled shared libraries
cp ~/dev/llm/llama.cpp/build-opencl/lib/*.so* ~/yzma-lib/
cp ~/dev/llm/llama.cpp/build-opencl/bin/*.so* ~/yzma-lib/ 2>/dev/null

# Set environment variable to point Yzma at our build
export YZMA_LIB=~/yzma-lib

# Verify Yzma loads the correct library
ls -la $YZMA_LIB/libllama.so

In Go application code, the library is loaded via llama.Load(os.Getenv("YZMA_LIB")). Yzma's purego-based FFI resolves symbols dynamically at runtime, so no recompilation of Go code is needed when switching between CPU and OpenCL builds — only the YZMA_LIB path changes.

## 5.7 Phase 6b: Yzma Application Code with GPU Layer Offload

To enable GPU offload in a Yzma Go application, configure the model parameters to offload all 28 layers to the GPU:
package main

import (
"fmt"
"os"
"github.com/hybridgroup/yzma/pkg/llama"
)

func main() {
llama.Load(os.Getenv("YZMA_LIB"))
llama.LogSet(llama.LogDefault())
llama.Init()

// Configure model with GPU offload
mparams := llama.ModelDefaultParams()
mparams.NGPULayers = 99  // Offload ALL layers to GPU

model, err := llama.ModelLoadFromFile("qwen3-0.6b-q4_0-pure.gguf", mparams)
if err != nil { panic(err) }

// Configure context for short prefill
cparams := llama.ContextDefaultParams()
cparams.NCtx = 1024        // Short context saves GPU memory
cparams.NThreads = 4        // CPU threads for non-offloaded ops
cparams.FlashAttn = false   // Disable unless validated working

ctx, err := llama.InitFromModel(model, cparams)
if err != nil { panic(err) }

// ... tokenize, batch, sample as normal ...
}

The critical parameter is mparams.NGPULayers = 99. This tells llama.cpp to offload all 28 transformer layers plus the output layer to the OpenCL device. On initialization, the backend will log which tensors are placed on CPU vs GPU. For Qwen3-0.6B at Q4_0 (~340 MB), all tensors should fit within the Adreno 702's addressable memory space.

## 5.8 Phase 7: Benchmark and Validate

Run the llama-bench tool to measure both prefill (pp) and decode (tg) performance with and without GPU offload:
# CPU-only baseline (disable GPU)
build-opencl/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -ngl 0 -p 256 -n 128

# GPU-offloaded (all layers)
build-opencl/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -ngl 99 -p 256 -n 128

Expected benchmark results for Qwen3-0.6B Q4_0 on Arduino Uno Q 4 GB:

| **Metric** | **CPU-only (ngl=0)** | **OpenCL GPU (ngl=99)** | **Improvement** |
| --- | --- | --- | --- |
| **Prefill (pp256) tok/s** | **~15–25** | **~80–200 (projected)** | **4–10×** |
| **Decode (tg128) tok/s** | **~8–12** | **~8–12** | **~1.0× (no change)** |
| **Time-to-first-token (256 tok prompt)** | **~10–18 sec** | **~1.5–4 sec** | **4–10×** |

**Note on prefill projections: **The Adreno 830 (flagship) achieves 384–510 tok/s prefill for DeepSeek R1 1.5B, a model 2.5× larger than Qwen3-0.6B. The A702 has roughly 1/10th the shader cores of the A830. Scaling linearly: 384/10 × 2.5 = ~96 tok/s prefill for Qwen3-0.6B. With kernel overhead and reduced memory bandwidth efficiency, 80–200 tok/s is a reasonable range. The CPU-only A53 prefill for a similar-sized model is approximately 15–25 tok/s.

## 5.9 Phase 8: Contingency — If OpenCL Fails on A702

If the Adreno 702 OpenCL driver is missing, incompatible, or produces incorrect results, the fallback is a maximally-optimized CPU-only build that still represents a significant improvement over the Ollama baseline:
cmake -B build-cpu -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_OPENCL=OFF \
-DGGML_NATIVE=ON \
-DGGML_OPENMP=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto' \
-DCMAKE_EXE_LINKER_FLAGS='-flto'

cmake --build build-cpu -j4
cp build-cpu/lib/*.so* ~/yzma-lib/

This CPU-only build with LTO, A53-specific scheduling, and OpenMP still provides approximately 1.3–1.8× improvement over Ollama's generic llama.cpp binary, yielding ~8–14 tok/s decode and ~20–30 tok/s prefill for Qwen3-0.6B Q4_0.

# 6. Memory Architecture and Zero-Copy Optimization

## 6.1 UMA Advantage

The QRB2210 is a UMA (Unified Memory Architecture) SoC. The CPU and GPU share the same physical LPDDR4X memory. This eliminates the explicit host-to-device memory copy that dominates PCIe-based GPU inference (where model weights must be transferred across a 16 GB/s PCIe bus before computation begins). On UMA systems, the model can be mapped into GPU-addressable virtual memory at zero cost.
However, this UMA advantage is only realized if the OpenCL implementation uses zero-copy buffer management. The llama.cpp OpenCL backend supports SVM (Shared Virtual Memory) coarse-grain buffers, which create a single allocation visible to both CPU and GPU. The initialization log should show:
ggml_opencl: SVM coarse grain buffer support: true

If SVM is unavailable, the backend falls back to clCreateBuffer with CL_MEM_COPY_HOST_PTR, which creates a GPU-side copy of the model weights. On a 4 GB system with ~340 MB of Q4_0 weights, this duplication would consume ~680 MB of the ~2.5 GB available after OS overhead — tight but feasible. With SVM, only the original ~340 MB allocation exists.

## 6.2 Memory Budget with OpenCL Active

| **Component** | **Without OpenCL** | **With OpenCL (SVM)** | **With OpenCL (Copy)** |
| --- | --- | --- | --- |
| **Debian OS + services** | **~1.0 GB** | **~1.0 GB** | **~1.0 GB** |
| **Model weights (Q4_0)** | **340 MB** | **340 MB (shared)** | **680 MB (duplicated)** |
| **KV cache (1K ctx, Q8_0)** | **28 MB** | **28 MB** | **56 MB (duplicated)** |
| **OpenCL runtime + kernels** | **0 MB** | **~50–100 MB** | **~50–100 MB** |
| **GPU scratch/temp buffers** | **0 MB** | **~50–100 MB** | **~50–100 MB** |
| **Go runtime (Yzma)** | **~30 MB** | **~30 MB** | **~30 MB** |
| **Total** | **~1.4 GB** | **~1.5–1.6 GB** | **~1.9–2.0 GB** |
| **Remaining (4 GB board)** | **~2.6 GB** | **~2.4–2.5 GB** | **~2.0–2.1 GB** |

Both configurations fit comfortably on the 4 GB variant. The 2 GB variant is too constrained for OpenCL — the runtime overhead alone would leave insufficient memory for model weights plus KV cache.

# 7. Advanced Tuning Parameters

## 7.1 Layer Split Strategy

While -ngl 99 (offload everything) is the simplest approach, fine-tuning layer placement may improve performance if the A702's limited shader cores create a GPU-side bottleneck for certain layer types:

| **Strategy** | **Flag** | **When to Use** |
| --- | --- | --- |
| **Full GPU offload** | **-ngl 99** | **Default; maximizes prefill acceleration** |
| **Partial offload** | **-ngl 14** | **If GPU OOM or instability; offload first half** |
| **CPU-only decode, GPU prefill** | **-ngl 99 --device none (decode)** | **Not directly supported; requires code modification** |

## 7.2 KV Cache Quantization

Reducing KV cache memory frees GPU buffer space and reduces cache-related memory traffic:
# Q8_0 KV cache (default, good balance)
-ctk q8_0 -ctv q8_0

# Q4_0 KV cache (saves 50% memory, slight quality loss)
-ctk q4_0 -ctv q4_0

For Qwen3-0.6B with grouped query attention (8 KV heads), the per-token KV cache cost at Q8_0 is approximately 56 KB. At 1024-token context, this is ~57 MB total. Quantizing to Q4_0 halves this to ~28 MB but introduces measurable perplexity degradation in small models with GQA.

## 7.3 Context Length Optimization

Shorter context lengths reduce both prefill computation and KV cache memory. For interactive use on the Uno Q, context lengths of 512–1024 tokens provide the best latency/utility tradeoff. The maximum practical context on the 4 GB board with OpenCL active is approximately 2048–4096 tokens before memory pressure becomes problematic.

# 8. Expected Outcomes and Performance Targets

| **Metric** | **Current (Ollama CPU)** | **Target (Yzma + OpenCL)** | **How Achieved** |
| --- | --- | --- | --- |
| **TTFT (256-tok prompt)** | **~28 sec** | **4–9 sec** | **GPU-accelerated prefill** |
| **TTFT (64-tok prompt)** | **~8–12 sec** | **1–3 sec** | **GPU-accelerated prefill** |
| **Decode throughput** | **~5 tok/s** | **~8–12 tok/s** | **Native build + Q4_0 (not GPU)** |
| **Memory usage** | **~1.8 GB** | **~1.5–1.6 GB** | **Smaller model + SVM zero-copy** |
| **Total system power** | **~6.1 W** | **~7–8 W (est.)** | **GPU active adds ~1–2 W** |

The primary user-experience improvement is in TTFT reduction. A response that previously took 28 seconds to begin will now start in under 10 seconds (and potentially under 5 for short prompts). Once generation begins, sustained output speed remains at 8–12 tok/s — adequate for real-time text display on embedded interfaces.

# 9. Conclusion

The Adreno 702 OpenCL path represents the single highest-impact optimization available for reducing Qwen3-0.6B time-to-first-token on the Arduino Uno Q. By building a custom libllama.so with Qualcomm's Adreno-optimized OpenCL kernels and hot-swapping it into Yzma's library path, the compute-bound prefill phase can be offloaded to a GPU with 5–13× more FP16 throughput than the Cortex-A53 CPU cores. The implementation requires no modifications to Yzma's source code, no changes to the Go application, and no Yzma codebase extensions — only a library replacement.
The approach is contingent on the Adreno 702's OpenCL driver quality. The llama.cpp backend explicitly supports A6xx IoT GPUs with recent drivers, and the QRB2210 ships with Qualcomm's proprietary driver stack, making this a strong candidate for compatibility. If OpenCL initialization fails, the CPU-only fallback still delivers 1.3–1.8× over the Ollama baseline.
Decode throughput remains physically capped by the ~3.5 GB/s LPDDR4X memory bandwidth, regardless of GPU involvement. For applications requiring faster generation, the upcoming Arduino Ventuno Q (Dragonwing IQ-8275, 16 GB LPDDR5, 40 TOPS NPU) represents the next hardware step within the Arduino ecosystem.

# 10. References and Sources

llama.cpp OpenCL Backend Documentation: *github.com/ggml-org/llama.cpp/blob/master/docs/backend/OPENCL.md*
Qualcomm Dragonwing QRB2210 Product Brief: *docs.qualcomm.com/bundle/publicresource/87-61720-1*
Yzma Repository and Installation Guide: *github.com/hybridgroup/yzma*
IWOCL 2025 Presentation: Optimizations of the OpenCL Backend in llama.cpp: *iwocl.org (Hongqiang Wang, Qualcomm)*
Linux Kernel A702 Support Patches: *freedreno@lists.freedesktop.org (Konrad Dybcio, Linaro)*
Mesa Freedreno A7xx Support: *Phoronix, Mesa 24.3 release notes*
Arduino Uno Q Hardware Documentation: *docs.arduino.cc/hardware/uno-q/*
Qwen3 Technical Report: *arxiv.org/abs/2505.09388*
OpenCL UMA Zero-Copy Analysis (Issue #5965): *github.com/ggml-org/llama.cpp/issues/5965*
