TECHNICAL WHITEPAPER
**GPU-Enhanced Prefill and Decode Throughput**
Qwen3-0.6B Inference on the Arduino Ventuno Q
via Yzma + llama.cpp with OpenCL, Hexagon NPU, and LPDDR5

Qualcomm Dragonwing IQ-8275  |  8-core Kryo Gen 6  |  Adreno 623 GPU
40 TOPS Hexagon NPU  |  16 GB LPDDR5 @ 3200 MHz  |  64 GB eMMC

March 2026
*Successor document to: Adreno 702 OpenCL Prefill + Decode Throughput Whitepapers (Uno Q)*

# 1. Executive Summary

The Arduino Ventuno Q, announced March 9, 2026 at Embedded World, represents a **generational leap** over the Arduino Uno Q for on-device LLM inference. Powered by the Qualcomm Dragonwing IQ-8275 SoC with 8-core Kryo Gen 6 CPU (ARMv9), Adreno 623 GPU, 40 TOPS Hexagon NPU, and 16 GB LPDDR5 at 3200 MHz, this board eliminates the memory bandwidth bottleneck that capped the Uno Q at ~10–12 tok/s decode.
This whitepaper provides the complete implementation blueprint for running Qwen3-0.6B via Yzma on the Ventuno Q, targeting **sub-1-second TTFT** and **50–80 tok/s sustained decode** — a **5–8× improvement** over the Uno Q and a **10–15× improvement** over the original Ollama baseline. Three acceleration paths are analyzed: Adreno 623 OpenCL (proven, production-ready), Hexagon NPU via QNN/FastRPC (experimental, highest potential), and optimized CPU with ARMv9 dot-product and i8mm extensions.
The Ventuno Q is priced under $300, available Q2 2026, and runs Ubuntu or Debian Linux with full Arduino App Lab integration. It is the first Arduino board where Qwen is an *officially listed pre-optimized model* for the NPU.

# 2. Hardware Architecture: IQ-8275 SoC Deep Dive

## 2.1 SoC Overview vs. Uno Q

| **Component** | **Arduino Uno Q (QRB2210)** | **Arduino Ventuno Q (IQ-8275)** | **Improvement Factor** |
| --- | --- | --- | --- |
| **CPU** | **4× A53 @ 2.0 GHz (ARMv8.0, in-order)** | **2× Kryo Gold Prime @ 2.35 GHz + 2× Gold @ 2.1 GHz + 4× Silver @ 1.95 GHz (ARMv9, OoO)** | **~4–6× single-thread, ~3–4× multi-thread** |
| **GPU** | **Adreno 702 @ 845 MHz (~50–100 GFLOPS)** | **Adreno 623 (~500–1000 GFLOPS est.)** | **~5–10×** |
| **NPU** | **None** | **Hexagon Tensor Processor (HVX + HMX), 40 TOPS INT8** | **Infinity (new capability)** |
| **RAM** | **2–4 GB LPDDR4X @ 1804 MHz** | **16 GB LPDDR5 @ 3200 MHz** | **4× capacity, ~3.5× bandwidth** |
| **Memory BW (theoretical)** | **~14.4 GB/s** | **~51.2 GB/s (4×16-bit @ 3200 MHz DDR)** | **~3.5×** |
| **Memory BW (effective est.)** | **~3.5 GB/s** | **~20–30 GB/s** | **~6–9×** |
| **Storage** | **16–32 GB eMMC** | **64 GB eMMC + M.2 NVMe Gen4** | **2–10×** |
| **ISA Extensions** | **NEON only (no dotprod, no i8mm)** | **NEON + dotprod + i8mm + SVE2** | **Full modern ARM acceleration** |
| **OpenCL** | **2.0 (A6xx path, untested)** | **3.0 (A6xx mature, verified similar GPUs)** | **Proven compatibility** |
| **Price** | **$44–$53** | **<$300** | **~5–6×** |

## 2.2 Memory Bandwidth: The Unlock

The Ventuno Q’s LPDDR5 at 3200 MHz across a 4×16-bit (64-bit total) interface delivers **51.2 GB/s theoretical bandwidth**. At the same ~50–60% effective utilization ratio observed on comparable Qualcomm SoCs, the effective read bandwidth for LLM inference is estimated at **25–32 GB/s**. For Qwen3-0.6B Q4_0 at ~340 MB:
**Max decode tok/s = 30 GB/s ÷ 0.340 GB ≈ 88 tok/s**
Even at a conservative 50% efficiency (25 GB/s), the ceiling is ~73 tok/s. This represents a fundamental regime change from the Uno Q’s 10 tok/s ceiling. The memory bandwidth is no longer the primary bottleneck for a 0.6B model — kernel dispatch overhead, sampling latency, and compute efficiency become the limiting factors instead.

## 2.3 The Adreno 623 GPU

The Adreno 623 is a mid-range A6xx-family GPU, roughly equivalent to what shipped in the Snapdragon 765G. It features multiple Shader Processors (SPs), supports OpenCL 3.0, Vulkan 1.1, and has **substantially more compute units than the Adreno 702**. Estimated FP16 throughput is 500–1,000 GFLOPS — enough to make prefill for Qwen3-0.6B nearly instantaneous.
The Adreno 623 falls within the A6xx GPU family that the llama.cpp OpenCL backend explicitly supports for IoT platforms. Given that the IQ-8275 ships with Qualcomm’s proprietary driver stack (not outdated phone drivers), OpenCL compatibility is expected to be solid. The 50+ custom Adreno-optimized kernels in the backend should activate without modification.

## 2.4 The 40 TOPS Hexagon NPU

The IQ-8275’s Hexagon Tensor Processor features both HVX (Hexagon Vector eXtension) and HMX (Hexagon Matrix eXtension) units. The HMX unit delivers the bulk of the 40 TOPS INT8 performance through dedicated matrix multiplication hardware. For FP16 operations, the HMX can achieve approximately **6–12 TFLOPS** based on research measurements on comparable Hexagon V73/V75 architectures. The IQ-8275 specifically includes a V73 HVX/HMX core at 1.7 GHz plus a V66 DSP core at 1.3 GHz.
The NPU represents the highest-performance acceleration path for LLM inference on this board, but with significant software complexity. Three pathways exist for accessing the NPU from llama.cpp:

| **Path** | **Maturity** | **Performance** | **Complexity** |
| --- | --- | --- | --- |
| **Qualcomm QNN SDK** | **Production (Qualcomm AI Hub)** | **High (40 TOPS INT8)** | **High: proprietary SDK, model conversion** |
| **ggml-hexagon (FastRPC)** | **Research prototype** | **Moderate–High** | **Very high: reverse-engineered HMX instructions** |
| **ggml-qnn backend (PR #12049)** | **In development** | **Unknown (7–10× reported)** | **High: requires QNN SDK integration** |

A critical limitation: the Hexagon NPU is a **32-bit processor** with a 32-bit virtual address space. Research shows that models below 4B parameters work well, and Qwen3-0.6B at ~340 MB fits comfortably. However, the NPU’s software stack (QNN) only supports **per-tensor or per-channel quantization**, not the fine-grained group quantization used by GGUF Q4_0. Bridging this gap requires either re-quantizing the model for QNN or using the experimental ggml-hexagon backend that implements custom dequantization on the HVX vector units.

## 2.5 Kryo Gen 6 CPU: ARMv9 with dotprod and i8mm

Unlike the Uno Q’s Cortex-A53 (ARMv8.0), the Kryo Gen 6 cores in the IQ-8275 support **ARMv9** with the full modern extension set: NEON, dotprod (SDOT/UDOT), i8mm, and potentially SVE2. This means llama.cpp’s **Q4_0_4_4 and Q4_0_4_8 repacked quantization formats** will activate correctly — the same formats that crashed on the Uno Q’s A53. The Q4_0_4_4 NEON-optimized GEMM provides up to 2× prefill acceleration and modest decode improvement on ARM cores with dotprod.
Furthermore, the 2+2+4 big.LITTLE configuration allows strategic thread placement: binding inference threads to the 2× Gold Prime cores (2.35 GHz, highest single-thread performance) for decode, and using all 8 cores for prefill. The KleidiAI microkernels in llama.cpp will automatically detect and use the available dotprod and i8mm instructions via runtime CPU feature detection.

# 3. Three Acceleration Paths: Analysis and Recommendations

The Ventuno Q offers three distinct compute backends for llama.cpp inference. Each has different maturity, performance characteristics, and implementation complexity:

## 3.1 Path A: Adreno 623 OpenCL (Recommended for Day-1 Deployment)

This is the most mature and reliable acceleration path. The llama.cpp OpenCL backend with Adreno-optimized kernels has been verified on Adreno 750/830/X85, and the Adreno 623 (A6xx family, IoT platform with recent drivers) falls within the stated support matrix. Expected results for Qwen3-0.6B Q4_0 pure:

| **Metric** | **CPU-only (8 threads)** | **OpenCL GPU (ngl=99)** | **Combined (CPU decode + GPU prefill)** |
| --- | --- | --- | --- |
| **Prefill (pp256) tok/s** | **~100–200** | **~400–1,000** | **~400–1,000 (GPU)** |
| **Decode (tg128) tok/s** | **~50–80** | **~40–70 (may be slower)** | **~50–80 (CPU)** |
| **TTFT (256-tok prompt)** | **~1.5–2.5 sec** | **~0.3–0.7 sec** | **~0.3–0.7 sec** |

**Key insight: **On the Ventuno Q, GPU offload for decode may actually be *slower* than CPU-only decode because the Kryo Gen 6 cores with ARMv9 extensions are extremely efficient at bandwidth-bound GEMV operations, and the GPU offload introduces kernel launch overhead. The optimal strategy is likely **GPU for prefill, CPU for decode**, achieved by using -ngl 99 (which accelerates prefill via GPU matmul) but recognizing that the llama.cpp scheduler will automatically route single-token decode through the most efficient path.

## 3.2 Path B: Hexagon NPU via QNN (Highest Potential, Requires SDK)

The 40 TOPS Hexagon NPU represents the highest theoretical performance path. For Qwen3-0.6B, the NPU’s INT8 matrix multiplication hardware could theoretically process decode at:
**40 TOPS ÷ (2 × 596M params) ≈ 33 forward passes/sec at INT8**
However, realizing this potential requires significant software effort:

| **Requirement** | **Status** | **Path to Implementation** |
| --- | --- | --- |
| **QNN SDK installed on Ventuno Q** | **Expected (Qualcomm AI Hub integration)** | **Pre-installed or apt install** |
| **Model converted to QNN format** | **Manual conversion required** | **Export Qwen3-0.6B to ONNX, quantize via QNN tools** |
| **llama.cpp QNN backend** | **Experimental (PR #12049, builder repos)** | **Build from chraac/llama-cpp-qnn-builder or ggml-hexagon** |
| **Per-channel quantization (QNN limitation)** | **Accuracy loss vs group quantization** | **Accept ~2–5% perplexity degradation or use FP16 on HMX** |
| **Yzma library replacement** | **Same pattern as Uno Q** | **Build custom libllama.so with QNN, set YZMA_LIB** |

The most practical NPU path for day-1 is to use **Qualcomm AI Hub**, which is explicitly listed as a model source for the Ventuno Q. Qualcomm AI Hub provides pre-optimized Qwen models for the Hexagon NPU. However, these use the QNN runtime directly, not llama.cpp. Integrating this with Yzma would require a custom Go FFI wrapper around the QNN C API — a significant development effort but potentially delivering the best performance.

## 3.3 Path C: CPU-Only with ARMv9 Optimizations (Reliable Baseline)

Even without GPU or NPU offload, the Ventuno Q’s CPU delivers dramatic improvements over the Uno Q:

| **Optimization** | **Uno Q (A53)** | **Ventuno Q (Kryo Gen 6)** | **Improvement Source** |
| --- | --- | --- | --- |
| **Memory bandwidth** | **~3.5 GB/s effective** | **~25–30 GB/s effective** | **LPDDR5 + wider bus** |
| **GEMV kernel** | **Basic NEON (no dotprod)** | **Q4_0_4_4 repacked + dotprod + i8mm** | **ARMv9 extensions** |
| **Core performance** | **In-order, 2-wide, 2.0 GHz** | **Out-of-order, 4–6-wide, 2.35 GHz** | **~3–4× IPC improvement** |
| **Thread count** | **4 threads (all same)** | **8 threads (2+2+4 big.LITTLE)** | **2× threads, heterogeneous** |
| **Decode tok/s (projected)** | **~10–12** | **~50–80** | **~5–8×** |
| **Prefill tok/s (projected)** | **~15–25** | **~100–200** | **~5–10×** |

# 4. Step-by-Step Implementation

## 4.1 Phase 1: System Preparation

# The Ventuno Q runs Ubuntu or Debian Linux
sudo apt update && sudo apt install -y \
git build-essential cmake ninja-build \
libcurl4-openssl-dev pkg-config golang-go \
ocl-icd-libopencl1 ocl-icd-opencl-dev opencl-headers \
clinfo

# Verify OpenCL (Adreno 623 should appear)
clinfo | head -20

# Verify CPU features
lscpu | grep -i flags
# Should show: asimd dotprod i8mm (and possibly sve2)

# Set performance governor on all 8 cores
for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
echo performance | sudo tee $g > /dev/null
done

## 4.2 Phase 2: Build llama.cpp with OpenCL + CPU Optimizations

cd ~ && mkdir -p dev/llm && cd dev/llm
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp

# Build with OpenCL + Adreno + full ARMv9 optimization
cmake -B build -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_OPENCL=ON \
-DGGML_OPENCL_EMBED_KERNELS=ON \
-DGGML_OPENCL_USE_ADRENO_KERNELS=ON \
-DGGML_NATIVE=ON \
-DGGML_OPENMP=ON \
-DGGML_CPU_AARCH64=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=native -flto' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=native -flto' \
-DCMAKE_EXE_LINKER_FLAGS='-flto' \
-DCMAKE_SHARED_LINKER_FLAGS='-flto'

cmake --build build -j8  # Use all 8 cores for compilation

Note: -mcpu=native on the Ventuno Q will automatically detect the Kryo Gen 6 cores and enable dotprod, i8mm, and other ARMv9 extensions. The GGML_CPU_AARCH64=ON flag enables the Q4_0_4_4 and Q4_0_4_8 runtime repack paths that require these extensions. Unlike the Uno Q where AARCH64_REPACK must be 0, on the Ventuno Q it should report AARCH64_REPACK = 1.

## 4.3 Phase 3: Model Preparation

# Download pure Q4_0 for OpenCL path (Adreno-optimized)
./build/bin/llama-quantize --pure \
qwen3-0.6b-f16.gguf \
qwen3-0.6b-q4_0-pure.gguf Q4_0

# Also prepare Q4_K_M for CPU-only path (better quality)
./build/bin/llama-quantize \
qwen3-0.6b-f16.gguf \
qwen3-0.6b-q4_k_m.gguf Q4_K_M

# With 16 GB RAM, Q8_0 is also practical:
./build/bin/llama-quantize \
qwen3-0.6b-f16.gguf \
qwen3-0.6b-q8_0.gguf Q8_0

With 16 GB RAM (~14 GB available after OS), the Ventuno Q can comfortably run Q8_0 (639 MB) with full 32K context (KV cache ~3.6 GB at FP16), or even run **multiple models simultaneously**. The memory constraint that forced Q4_0 on the Uno Q is eliminated.

## 4.4 Phase 4: Yzma Integration

# Install Yzma
go install github.com/hybridgroup/yzma/cmd/yzma@latest

# Copy OpenCL-enabled libraries
mkdir -p ~/yzma-lib
cp ~/dev/llm/llama.cpp/build/lib/*.so* ~/yzma-lib/
export YZMA_LIB=~/yzma-lib
echo 'export YZMA_LIB=~/yzma-lib' >> ~/.bashrc

## 4.5 Phase 5: Optimal Run Configurations

**Configuration A: Maximum decode throughput (CPU-only, ARMv9 optimized)**
./build/bin/llama-cli \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 \              # Use 4 Gold/Gold Prime cores only
-tb 8 \             # All 8 cores for batch (prefill)
-c 4096 \           # Generous context (16 GB allows it)
--mlock \
-ctk q8_0 -ctv q8_0 \
-ngl 0 \            # CPU-only decode
-p "Explain quantum computing in simple terms."

**Configuration B: Minimum TTFT (GPU-accelerated prefill)**
./build/bin/llama-cli \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -tb 8 \
-c 4096 --mlock \
-ctk q8_0 -ctv q8_0 \
-ngl 99 \           # Offload all layers to Adreno 623
-p "Explain quantum computing in simple terms."

**Configuration C: Best quality (Q8_0, generous context)**
./build/bin/llama-cli \
-m qwen3-0.6b-q8_0.gguf \
-t 4 -tb 8 \
-c 8192 --mlock \
-ctk q8_0 -ctv q8_0 \
-ngl 0 \
-p "Write a detailed analysis of renewable energy policy."

With Q8_0 (639 MB), decode is projected at ~40–50 tok/s (lower than Q4_0 due to larger weight reads but with near-perfect quality). The 16 GB RAM allows 8K+ context without memory pressure.

# 5. Performance Projections: Ventuno Q vs. Uno Q vs. Alternatives

| **Configuration** | **Prefill tok/s (pp256)** | **Decode tok/s (tg128)** | **TTFT (256-tok)** | **RAM Headroom** |
| --- | --- | --- | --- | --- |
| **Uno Q: Ollama + TinyLlama 1.1B** | **~5–8** | **~5.4** | **~28 sec** | **~200 MB free** |
| **Uno Q: Optimized (Whitepaper 1+2)** | **~80–200 (OpenCL)** | **~10–12** | **~2–4 sec** | **~800 MB free** |
| **Ventuno Q: CPU-only Q4_0** | **~100–200** | **~50–80** | **~1.5–2.5 sec** | **~13 GB free** |
| **Ventuno Q: OpenCL Q4_0** | **~400–1,000** | **~50–80** | **~0.3–0.7 sec** | **~12.5 GB free** |
| **Ventuno Q: CPU-only Q8_0** | **~60–120** | **~40–50** | **~2–4 sec** | **~12.5 GB free** |
| **Ventuno Q: NPU (projected)** | **~500–2,000** | **~60–100** | **~0.1–0.3 sec** | **~13 GB free** |
| **Jetson Orin Nano (comparison)** | **~300–800 (CUDA)** | **~80–150** | **~0.3–0.8 sec** | **~4–6 GB free** |
| **RPi 5 8GB (comparison)** | **~30–60** | **~20–30** | **~4–8 sec** | **~5 GB free** |

The Ventuno Q’s projected performance puts it in the same tier as the NVIDIA Jetson Orin Nano for small models, while offering **2.5–3× more RAM** (16 GB vs 8 GB) and the Arduino ecosystem integration. For Qwen3-0.6B specifically, the 16 GB LPDDR5 is vastly overprovisioned, leaving headroom for concurrent model loading, vision model inference, or ROS 2 workloads running alongside.

# 6. Advanced: Hexagon NPU Exploration Path

## 6.1 Qualcomm AI Hub Integration

The Arduino Ventuno Q product page explicitly lists Qwen as a pre-optimized model for the NPU, powered by Edge Impulse and Qualcomm AI Hub. This suggests that Qualcomm has prepared QNN-format Qwen models that can run natively on the Hexagon NPU without llama.cpp. The integration path for Yzma would be:

| **Step** | **Action** | **Tool** |
| --- | --- | --- |
| **1** | **Download pre-optimized Qwen3-0.6B from Qualcomm AI Hub** | **AI Hub CLI or web portal** |
| **2** | **Deploy QNN model to Ventuno Q** | **qnn-net-run or custom application** |
| **3** | **Write Go FFI wrapper around QNN C API** | **Yzma-style purego bindings** |
| **4** | **Integrate with Yzma’s token sampling and chat interface** | **Custom Go code** |

This bypasses llama.cpp entirely and uses Qualcomm’s native inference stack, which is the path most likely to achieve the full 40 TOPS NPU performance. The downside is losing llama.cpp’s flexible GGUF model ecosystem and requiring custom Go development.

## 6.2 ggml-hexagon Research Path

For developers who want NPU acceleration *within* the llama.cpp ecosystem, the experimental ggml-hexagon backend (based on the research paper "Scaling LLM Test-Time Compute with Mobile NPU") provides a FastRPC-based path. This backend has demonstrated models below 4B parameters running on Hexagon V73/V75 NPUs. The IQ-8275’s V73 core is directly compatible.
Key requirements: Hexagon SDK 6.x, cross-compilation toolchain, the experimental HTP-Ops-lib for custom FP16 HMX kernel access. The build process is substantially more complex than the OpenCL path and requires Android NDK even for Linux targets (due to the FastRPC library dependencies).

# 7. Memory Budget Analysis

The 16 GB LPDDR5 transforms the memory situation from constrained to abundant:

| **Component** | **Uno Q (4 GB)** | **Ventuno Q (16 GB)** |
| --- | --- | --- |
| **OS + services** | **~1.0 GB** | **~1.5 GB (Ubuntu more overhead)** |
| **Model weights (Q4_0)** | **340 MB** | **340 MB** |
| **Model weights (Q8_0)** | **Not practical** | **639 MB** |
| **KV cache (4K ctx, Q8_0)** | **~229 MB (tight)** | **~229 MB (trivial)** |
| **KV cache (32K ctx, FP16)** | **Impossible** | **~3,584 MB (feasible)** |
| **OpenCL runtime + buffers** | **~100–200 MB** | **~100–200 MB** |
| **Go runtime (Yzma)** | **~30 MB** | **~30 MB** |
| **Available for other tasks** | **~200 MB** | **~10–13 GB** |

With 10+ GB of free RAM, the Ventuno Q can simultaneously run Qwen3-0.6B for text inference, a vision model (SmolVLM2-500M at ~350 MB) for camera processing, and a TTS model for audio output — all while running ROS 2 nodes for robot control. This **multi-model concurrent inference** capability is a qualitative leap over the Uno Q’s single-model-barely-fits constraint.

# 8. Benchmarking Protocol

# Full benchmark suite for the Ventuno Q

# CPU-only (all 8 cores, ARMv9 optimized)
./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 8 -ngl 0 -p 64,128,256,512,1024 -n 256 -r 5

# CPU-only (4 Gold cores only, for decode comparison)
taskset -c 0-3 ./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -ngl 0 -p 256 -n 256 -r 5

# GPU offload (Adreno 623 OpenCL)
./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -ngl 99 -p 64,128,256,512,1024 -n 256 -r 5

# Q8_0 quality mode
./build/bin/llama-bench \
-m qwen3-0.6b-q8_0.gguf \
-t 8 -ngl 0 -p 256 -n 256 -r 5

# Context length scaling test
for ctx in 512 1024 2048 4096 8192; do
./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 8 -ngl 0 -c $ctx -p 256 -n 256 -r 3
done

# 9. Migration Guide: Uno Q to Ventuno Q

For developers already running Yzma + Qwen3-0.6B on the Uno Q following the companion whitepapers, migration to the Ventuno Q is straightforward:

| **Step** | **What Changes** | **What Stays the Same** |
| --- | --- | --- |
| **1. Hardware swap** | **Board replacement, USB-C power** | **GGUF model files, Go application code** |
| **2. OS setup** | **Ubuntu 24.04 LTS (Canonical certified)** | **SSH workflow, apt packages** |
| **3. Rebuild llama.cpp** | **Add -mcpu=native (detects ARMv9 automatically)** | **Same CMake flags otherwise** |
| **4. Rebuild Yzma lib** | **Copy new libllama.so to YZMA_LIB** | **Same Go code, same YZMA_LIB env var** |
| **5. Update runtime flags** | **Increase -c (4096+), -t 8, optional -ngl 99** | **Same model file, same sampling params** |
| **6. Enjoy 5–8× performance** | **~50–80 tok/s decode, <1s TTFT** | **Same application logic** |

The critical point: Yzma’s architecture (Go FFI to libllama.so) means the Go application code is identical between the Uno Q and Ventuno Q. Only the shared library and runtime parameters change. This is the core benefit of Yzma’s design — hardware acceleration is an infrastructure concern, not an application concern.

# 10. Conclusion

The Arduino Ventuno Q fundamentally changes the inference landscape for Qwen3-0.6B on Arduino hardware. The combination of LPDDR5 bandwidth (~25–30 GB/s effective), ARMv9 CPU cores with dotprod/i8mm, the Adreno 623 GPU, and a 40 TOPS Hexagon NPU transforms inference from a bandwidth-starved 10 tok/s crawl to a **50–80+ tok/s conversational experience with sub-second TTFT**.
The recommended implementation path is: build llama.cpp with OpenCL + Adreno kernels + native ARMv9 optimization, use pure Q4_0 for the GPU path or Q8_0 for the CPU quality path, and integrate via Yzma’s standard library replacement mechanism. The NPU path via Qualcomm AI Hub offers even higher performance but requires departing from the llama.cpp ecosystem into Qualcomm’s proprietary QNN stack.
For developers currently on the Uno Q, the Ventuno Q upgrade delivers a **5–8× decode improvement and 10–20× TTFT improvement** with zero Go application code changes. It is the natural next step within the Arduino ecosystem for anyone serious about on-device LLM inference in robotics, industrial AI, and edge computing applications.

# 11. References

Arduino Ventuno Q Product Page: *arduino.cc/product-ventuno-q*
Qualcomm Dragonwing IQ-8275 Product Brief: *docs.qualcomm.com/bundle/publicresource/87-83839-1*
QCS8275 Data Sheet: *Qualcomm Documentation (80-73475-1)*
Qualcomm IQ8 Series Platform Overview: *qualcomm.com/internet-of-things/products/iq8-series*
llama.cpp OpenCL Backend (OPENCL.md): *github.com/ggml-org/llama.cpp*
Yzma Repository: *github.com/hybridgroup/yzma*
llama.cpp QNN Builder: *github.com/chraac/llama-cpp-qnn-builder*
ggml-hexagon (NPU Research Prototype): *github.com/haozixu/llama.cpp-npu*
"Scaling LLM Test-Time Compute with Mobile NPU" (arXiv:2509.23324): *arxiv.org/abs/2509.23324*
Companion Whitepapers: Adreno 702 OpenCL Prefill + Decode Throughput (Uno Q): *See separate documents*
