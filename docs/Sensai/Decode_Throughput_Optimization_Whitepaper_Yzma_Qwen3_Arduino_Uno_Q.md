TECHNICAL WHITEPAPER
**Maximizing Decode Throughput**
Pushing Qwen3-0.6B Token Generation to the
LPDDR4X Bandwidth Ceiling on Arduino Uno Q

Yzma + llama.cpp Native Build Optimization Guide

Hardware: Qualcomm Dragonwing QRB2210  |  4× Cortex-A53 @ 2.0 GHz
Memory: 4 GB LPDDR4X  |  ~3.5 GB/s effective read bandwidth
Software: Yzma (hybridgroup) + llama.cpp natively compiled

March 2026
*Companion document to: Adreno 702 OpenCL Prefill Acceleration Whitepaper*

# 1. Executive Summary

This whitepaper provides a complete implementation guide for maximizing decode throughput (tokens/second during generation) for Qwen3-0.6B running via Yzma on the Arduino Uno Q 4 GB variant. Decode throughput is **memory-bandwidth-bound**, not compute-bound: every generated token requires reading essentially all model weights from DRAM once. The ~3.5 GB/s effective LPDDR4X read bandwidth creates a hard physics ceiling that no software optimization can exceed. This guide extracts every achievable tok/s within that ceiling.
The baseline is **~5.4 tok/s** (Ollama running TinyLlama 1.1B on the Uno Q, measured by Jeff Geerling). Through seven stacked optimizations — switching to the smaller Qwen3-0.6B model, using pure Q4_0 quantization, eliminating Ollama overhead via native llama.cpp, building with A53-specific compiler tuning and LTO, applying aggressive KV cache quantization, constraining context length, and tuning thread/batch parameters — the projected outcome is **10–14 tok/s** sustained decode: a **2–2.6× improvement** over the Ollama baseline. This is the maximum the hardware can physically deliver for this model at acceptable quality.

# 2. The Memory Bandwidth Wall: Physics of Decode on LPDDR4X

## 2.1 Why Decode Is Bandwidth-Bound

Auto-regressive token generation (decode) is fundamentally different from prompt processing (prefill). Each token generation step requires a full forward pass through the model, but with a batch size of 1: the input is a single token embedding, and the output is a single next-token probability distribution. The dominant cost is reading model weights from DRAM — every weight tensor must be streamed through the memory bus once per generated token. The arithmetic intensity (FLOPS per byte of memory traffic) is extremely low, typically 1–2 FLOPs/byte for quantized GEMV operations at batch size 1. This makes decode purely memory-bandwidth-limited on all modern hardware, from server GPUs down to embedded SoCs.
The governing equation is straightforward:
**Maximum decode tok/s = Effective Memory Read Bandwidth ÷ Model Size in Memory**
This is the Roofline Model applied to LLM inference at its simplest. For the QRB2210:

## 2.2 QRB2210 Memory Subsystem Characterization

The QRB2210 uses dual-channel 16-bit LPDDR4X at 1804 MHz. The theoretical aggregate bandwidth is calculated as: 2 channels × 16 bits × 2 (DDR) × 1804 MHz = 14.46 GB/s. However, real-world effective read bandwidth is substantially lower due to several factors:

| **Factor** | **Impact** | **Estimated Loss** |
| --- | --- | --- |
| **Bus contention (CPU + GPU + DMA)** | **Other bus masters compete for bandwidth** | **~20–30%** |
| **DRAM refresh cycles** | **Periodic refresh steals bus cycles** | **~5–8%** |
| **Read/write interleaving** | **Writes from KV cache updates interleave with reads** | **~10–15%** |
| **Controller efficiency** | **Protocol overhead, bank conflicts, page misses** | **~10–20%** |
| **OS and interrupt overhead** | **Kernel, timers, WiFi interrupts steal CPU + bus** | **~5–10%** |

Calibration from the TinyLlama benchmark: TinyLlama 1.1B Q4_0 (≈637 MB) at 5.44 tok/s yields an effective read bandwidth of 5.44 × 637 = **~3,465 MB/s (≈3.5 GB/s)**. This is ~24% of theoretical peak, consistent with LPDDR4X measurements on comparable IoT SoCs. The tinymembench tool measured 2,159–2,212 MB/s raw memcpy throughput, but llama.cpp’s access pattern (strided, multi-tensor) achieves higher effective throughput due to prefetching and sequential access within each tensor.

## 2.3 Decode Throughput Ceiling by Quantization

Using the calibrated 3.5 GB/s effective bandwidth, the theoretical maximum decode tok/s for Qwen3-0.6B at each quantization level is:

| **Quantization** | **Model Size** | **Theoretical Max tok/s** | **At 80% Efficiency** | **Quality Impact** |
| --- | --- | --- | --- | --- |
| **FP16 (unquantized)** | **~1,200 MB** | **2.9** | **2.3** | **Baseline quality** |
| **Q8_0** | **639 MB** | **5.5** | **4.4** | **Near-perfect (<0.5% loss)** |
| **Q4_K_M** | **~450 MB** | **7.8** | **6.2** | **Good (recommended minimum)** |
| **Q4_0 (pure)** | **~340 MB** | **10.3** | **8.2** | **Acceptable for 0.6B model** |
| **Q3_K_S** | **~250 MB** | **14.0** | **11.2** | **Noticeable degradation** |
| **Q2_K** | **~170 MB** | **20.6** | **16.5** | **Severe degradation at 0.6B** |
| **IQ2_XXS** | **~120 MB** | **29.2** | **23.3** | **Near-unusable for 0.6B** |

The "80% efficiency" column accounts for non-weight memory traffic (KV cache reads, intermediate activations, softmax buffers) and kernel overhead. The sweet spot for this hardware is **Q4_0 at ~340 MB**, yielding a realistic 8–10 tok/s with acceptable quality. Going to Q3_K_S gains 2–3 tok/s but introduces perceptible incoherence in a 0.6B model trained on 36 trillion tokens with minimal weight redundancy.

# 3. The Seven-Layer Optimization Stack

Each optimization targets a different source of throughput loss. They stack multiplicatively. The combined projected improvement is 2.0–2.6× over the Ollama TinyLlama baseline.

| **Layer** | **Optimization** | **Mechanism** | **Expected Gain** | **Cumulative** |
| --- | --- | --- | --- | --- |
| **1** | **Smaller model (Qwen3-0.6B vs TinyLlama 1.1B)** | **Less data to read per token** | **1.87×** | **1.87×** |
| **2** | **Pure Q4_0 quantization** | **Minimum viable size, uniform kernel path** | **1.0–1.05×** | **~1.9×** |
| **3** | **Eliminate Ollama overhead** | **Remove HTTP/Go/management layers** | **1.15–1.30×** | **~2.2–2.5×** |
| **4** | **A53-tuned native build with LTO** | **Better instruction scheduling + inlining** | **1.05–1.10×** | **~2.3–2.7×** |
| **5** | **KV cache quantization (Q4_0)** | **Reduce non-weight memory traffic** | **1.01–1.03×** | **~2.3–2.8×** |
| **6** | **Short context (512–1024 tokens)** | **Reduce attention memory + computation** | **1.01–1.02×** | **~2.3–2.8×** |
| **7** | **Thread + batch + mlock tuning** | **Reduce OS overhead, prevent swap** | **1.02–1.05×** | **~2.4–2.9×** |

*Baseline: ~5.4 tok/s (Ollama + TinyLlama 1.1B). Projected: ~10–14 tok/s (native llama.cpp + Qwen3-0.6B Q4_0).*

# 4. Layer 1: Model Selection — Why Qwen3-0.6B Is Optimal

## 4.1 Qwen3-0.6B Architecture

Qwen3-0.6B is a 28-layer dense decoder-only transformer with 596 million parameters (approximately 751 million including untied embeddings in some GGUF conversions). It uses grouped query attention (16 query heads, 8 KV heads, head dimension 128), SwiGLU activation, and RoPE positional encoding with base frequency 1,000,000 supporting up to 40,960 tokens of context.

| **Parameter** | **Value** | **Inference Relevance** |
| --- | --- | --- |
| **Hidden dimension** | **1,024** | **Determines weight matrix widths** |
| **Intermediate dimension** | **3,072** | **SwiGLU MLP; 3× hidden** |
| **Number of layers** | **28** | **Total sequential forward passes** |
| **Query heads** | **16** | **Attention computation cost** |
| **KV heads** | **8** | **GQA 2:1 ratio; halves KV cache** |
| **Head dimension** | **128** | **Per-head vector size** |
| **Vocabulary size** | **151,936** | **Large vocab; slightly heavier embedding** |
| **Total parameters** | **~596M (untied: ~751M)** | **Drives model file size** |

## 4.2 Bandwidth Advantage Over TinyLlama

At Q4_0 quantization, Qwen3-0.6B is approximately **340 MB** versus TinyLlama 1.1B at **637 MB**. Since decode tok/s is inversely proportional to model size on bandwidth-limited hardware, the theoretical speedup from the model swap alone is 637/340 = **1.87×**. This is the single largest contribution in the entire optimization stack and costs nothing — it is purely a model selection decision.
Quality-wise, Qwen3-0.6B trained on 36 trillion tokens with GQA and SwiGLU significantly outperforms TinyLlama 1.1B on most benchmarks despite having fewer parameters. The model is purpose-built for edge deployment and features hybrid thinking/non-thinking mode support.

# 5. Layer 2: Pure Q4_0 Quantization

## 5.1 Why Pure Q4_0

Standard Q4_0 quantization from tools like llama-quantize uses Q4_0 for most weight tensors but keeps certain layers (typically the output projection and sometimes attention output) at higher precision (Q6_K or Q8_0). While this preserves quality, it introduces **mixed-format dequantization overhead**: the inference engine must dispatch to different GEMV kernels for different tensor types within the same forward pass. On the bandwidth-limited Cortex-A53 where every microsecond of kernel overhead directly reduces achievable tok/s, this format switching costs 1–5% throughput.
The --pure flag forces all tensors to Q4_0, yielding a uniform kernel dispatch path. The tradeoff is a slight quality reduction in output logits (the output projection benefits most from higher precision), but for a 0.6B model in embedded applications, this tradeoff is acceptable.

## 5.2 Critical: Q4_0_4_4 Repack Does NOT Work on Cortex-A53

A critical hardware limitation must be understood: llama.cpp’s Q4_0_4_4 runtime repack format, which rearranges Q4_0 weights into a NEON-optimized GEMM layout, **requires the SDOT (Signed Dot Product) instruction from the ARMv8.4-A extension**. The Cortex-A53 implements ARMv8.0-A and **does not have SDOT**. The Q4_0_4_4 kernel will either crash with an illegal instruction fault or silently fall back to a scalar path that is slower than standard Q4_0.
Community reports confirm this issue on other ARMv8.0 devices (e.g., Rockchip RK3399 with Cortex-A72/A53). The Q4_0_4_4 and Q4_0_4_8 quantization formats were designed for ARMv8.4+ (Cortex-A76 and later) with dotprod and i8mm extensions. On the Uno Q, the standard Q4_0 format with baseline NEON GEMV kernels is the only safe and optimal path.
At build time, llama.cpp should report the following CPU features:
system_info: n_threads = 4 / 4 | CPU : NEON = 1 | ARM_FMA = 1 |
AARCH64_REPACK = 0 |   # MUST be 0 on A53 (no dotprod)

## 5.3 Quantization Command

# Download F16 source (if not already available)
# Then quantize with --pure for all-Q4_0
./build/bin/llama-quantize --pure \
qwen3-0.6b-f16.gguf \
qwen3-0.6b-q4_0-pure.gguf Q4_0

# Or download pre-quantized Q4_0 and verify purity:
./build/bin/llama-cli -m qwen3-0.6b-q4_0.gguf \
--verbose-prompt -p 'test' -n 1 2>&1 | grep 'type ='
# All tensors should show 'type = q4_0'

# 6. Layer 3: Eliminating Ollama Overhead

## 6.1 Where Ollama Loses Throughput

Ollama adds multiple abstraction layers between the user and llama.cpp’s inference engine. Each layer consumes CPU cycles and memory bandwidth that would otherwise be available for token generation:

| **Ollama Layer** | **Overhead Type** | **Estimated Cost** |
| --- | --- | --- |
| **Go HTTP server** | **goroutine scheduling, request parsing, JSON serialization** | **3–8% CPU time** |
| **Model management** | **Periodic model state checks, timeout monitoring** | **1–3% CPU time** |
| **Response streaming** | **SSE framing, chunked encoding, buffer copies** | **2–5% CPU time** |
| **Default context allocation** | **Always allocates 4096-token context regardless of need** | **~224 MB wasted KV cache memory** |
| **Go runtime GC** | **Garbage collection pauses during generation** | **1–3% intermittent stalls** |
| **Memory copying** | **Go↔C boundary data marshaling** | **2–5% bandwidth waste** |

In total, Ollama adds an estimated **13–30% overhead** on CPU-bound ARM systems. On the bandwidth-starved A53 where every percentage point translates to ~0.1 tok/s, this is significant. Switching to native llama.cpp (via Yzma’s in-process FFI or direct llama-cli) eliminates all of these layers.

## 6.2 Yzma vs. llama-cli vs. Ollama

| **Interface** | **Overhead** | **GPU Support** | **API Flexibility** |
| --- | --- | --- | --- |
| **Ollama** | **13–30%: Go HTTP + management** | **Via upstream llama.cpp** | **REST API, limited tuning** |
| **llama-cli** | **~0%: direct C++ execution** | **Full llama.cpp backends** | **CLI flags, max control** |
| **Yzma (Go FFI)** | **~1–2%: purego FFI call overhead** | **Inherits from linked libllama.so** | **Full llama.cpp C API via Go** |
| **llama-server** | **~3–5%: HTTP but no Go/management** | **Full llama.cpp backends** | **REST API, OpenAI-compatible** |

For maximum raw decode throughput, llama-cli is the gold standard (zero overhead). Yzma adds only microseconds of FFI dispatch per inference call, which is negligible relative to the milliseconds-per-token inference latency. For Go applications, Yzma is the optimal choice.

# 7. Layer 4: Cortex-A53-Tuned Native Build with LTO

## 7.1 Why Generic Builds Leave Performance on the Table

The prebuilt llama.cpp binaries distributed by Yzma’s llama-cpp-builder and Ollama are compiled for generic aarch64 — they must run on any ARMv8 processor from the A53 to the X4. This means the compiler cannot exploit A53-specific instruction scheduling, pipeline depth (8 stages, 2-wide in-order), or branch prediction characteristics. On an **in-order core** like the A53, instruction scheduling is critical: every pipeline bubble costs a full cycle because the hardware cannot reorder around stalls (unlike out-of-order cores like A76/A78 which can hide latency).

## 7.2 Build Commands

Build natively on the Uno Q for maximum optimization:
cd ~/dev/llm/llama.cpp

cmake -B build-opt -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_NATIVE=ON \
-DGGML_OPENMP=ON \
-DGGML_CPU_AARCH64=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto -fomit-frame-pointer' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto -fomit-frame-pointer' \
-DCMAKE_EXE_LINKER_FLAGS='-flto' \
-DCMAKE_SHARED_LINKER_FLAGS='-flto'

cmake --build build-opt -j4

Detailed flag analysis:

| **Flag** | **What It Does on A53** | **Decode Impact** |
| --- | --- | --- |
| **-mcpu=cortex-a53** | **A53-specific instruction scheduling; 8-stage pipeline model** | **Reduces pipeline stalls by 5–10%** |
| **+crypto** | **Enables AES/SHA NEON crypto extensions (present on QRB2210)** | **Marginal (crypto ops not used in inference)** |
| **-O3** | **Aggressive auto-vectorization, loop unrolling, function inlining** | **3–5% over -O2** |
| **-flto** | **Link-time optimization; cross-TU inlining of hot paths** | **3–8% from inlining ggml GEMV kernels** |
| **-fomit-frame-pointer** | **Frees one register (x29) for general use** | **1–2% on register-pressure-heavy GEMV loops** |
| **GGML_NATIVE=ON** | **Sets -march=native; detects A53 NEON features** | **Ensures correct feature detection** |
| **GGML_OPENMP=ON** | **Enables OpenMP threading for parallel GEMV** | **Enables multi-core decode** |
| **GGML_CPU_AARCH64=ON** | **Enables ARM-specific optimized kernel selection** | **Uses NEON GEMV paths** |

## 7.3 Profile-Guided Optimization (PGO) for Additional 5–10%

PGO is the most effective compiler optimization for in-order cores because it directly informs instruction scheduling and branch prediction hints:
# Step 1: Build with profiling instrumentation
cmake -B build-pgo-gen -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=OFF \
-DGGML_NATIVE=ON -DGGML_OPENMP=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto -fprofile-generate' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto -fprofile-generate'
cmake --build build-pgo-gen -j4

# Step 2: Run representative workload to collect profile
build-pgo-gen/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf -t 4 -p 256 -n 256 -r 3

# Step 3: Rebuild with collected profile data
cmake -B build-pgo-use -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_NATIVE=ON -DGGML_OPENMP=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto -fprofile-use -flto' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto -fprofile-use -flto' \
-DCMAKE_EXE_LINKER_FLAGS='-flto' \
-DCMAKE_SHARED_LINKER_FLAGS='-flto'
cmake --build build-pgo-use -j4

# 8. Layers 5–7: Runtime Configuration and System Tuning

## 8.1 Layer 5: KV Cache Quantization

The KV cache stores attention key and value tensors for all previous tokens in the context. During decode, the attention mechanism reads the entire KV cache for each token generated. Quantizing the KV cache reduces this memory traffic:

| **KV Quantization** | **Per-Token Cost (Qwen3-0.6B)** | **1024-Token Cache Size** | **Quality Impact** |
| --- | --- | --- | --- |
| **FP16 (default in some builds)** | **112 KB** | **~115 MB** | **Baseline** |
| **Q8_0** | **56 KB** | **~57 MB** | **Negligible loss** |
| **Q4_0** | **28 KB** | **~29 MB** | **Measurable on GQA models** |

For maximum decode throughput, use -ctk q8_0 -ctv q8_0 as the default. Going to Q4_0 KV saves an additional ~28 MB at 1024 tokens but introduces perplexity degradation that is amplified by Qwen3's grouped query attention architecture (where each KV head serves two query heads, making KV precision more impactful). The Q8_0 KV cache represents the optimal quality/speed tradeoff.

## 8.2 Layer 6: Context Length Optimization

Context length affects decode throughput through two mechanisms. First, the attention computation scales linearly with context length during decode (each new token attends to all previous tokens). Second, the KV cache size grows linearly, consuming memory bandwidth during attention readback. For embedded interactive use:

| **Context Length** | **KV Cache (Q8_0)** | **Attention Overhead** | **Recommended Use** |
| --- | --- | --- | --- |
| **256 tokens** | **~14 MB** | **Minimal** | **Single-turn Q&A, commands** |
| **512 tokens** | **~29 MB** | **Low** | **Short conversations** |
| **1024 tokens** | **~57 MB** | **Moderate** | **General interactive use** |
| **2048 tokens** | **~115 MB** | **Significant** | **Longer conversations (quality trades off)** |
| **4096 tokens (Ollama default)** | **~229 MB** | **Heavy** | **Wasteful on 4 GB board** |

Recommendation: -c 1024 for general use, -c 512 for maximum throughput in single-turn applications.

## 8.3 Layer 7: Thread, Memory, and OS Tuning

The following runtime parameters extract the last few percentage points of throughput:
**Thread count: **With 4 A53 cores and bandwidth-limited decode, 3–4 threads is optimal. Using fewer threads underutilizes the memory controllers; using more (via hyperthreading, which A53 does not have) is impossible. During decode, threads primarily help with the OpenMP-parallelized GEMV kernel where each thread processes a slice of the weight matrix. With ~3.5 GB/s shared bandwidth, 4 threads each streaming ~875 MB/s is near-optimal.
**Memory locking (mlock): **The --mlock flag calls mlock() on the model’s memory-mapped file, preventing the Linux kernel from paging model weights to eMMC swap. On the Uno Q’s 32 GB eMMC (read speed ~100–200 MB/s), even a single page fault during decode causes a 20–50ms stall that drops instantaneous throughput to near zero for that token. mlock is **essential** on memory-constrained boards.
**Memory mapping (mmap): **llama.cpp uses mmap by default for GGUF files, which is beneficial: the kernel’s page cache and read-ahead logic prefetch model data efficiently for the sequential access pattern of transformer forward passes. Do **not** disable mmap (--no-mmap) unless debugging specific issues.
**CPU governor: **Ensure the Linux CPU frequency governor is set to performance mode to prevent clock throttling during inference:
# Set all cores to max frequency
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
echo performance | sudo tee $cpu
done

# Verify 2.0 GHz on all cores
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq

**Background process cleanup: **Kill unnecessary services to free memory bandwidth and reduce interrupt-driven CPU contention:
# Identify memory-hungry processes
ps aux --sort=-%mem | head -15

# Disable WiFi if not needed (saves ~1–2% bandwidth)
sudo rfkill block wifi

# Stop desktop environment if running headless
sudo systemctl stop lightdm  # or equivalent

# 9. Complete Implementation: Build, Configure, Run, Benchmark

## 9.1 Full Build Script

#!/bin/bash
set -euo pipefail

# === System Preparation ===
sudo apt update && sudo apt install -y \
git build-essential cmake ninja-build \
libcurl4-openssl-dev pkg-config golang-go

# Set CPU to performance mode
for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
echo performance | sudo tee $g > /dev/null
done

# === Build llama.cpp ===
cd ~ && mkdir -p dev/llm && cd dev/llm
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp

cmake -B build -G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DBUILD_SHARED_LIBS=ON \
-DGGML_NATIVE=ON \
-DGGML_OPENMP=ON \
-DGGML_CPU_AARCH64=ON \
-DCMAKE_C_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto -fomit-frame-pointer' \
-DCMAKE_CXX_FLAGS='-O3 -mcpu=cortex-a53+crypto -flto -fomit-frame-pointer' \
-DCMAKE_EXE_LINKER_FLAGS='-flto' \
-DCMAKE_SHARED_LINKER_FLAGS='-flto'

cmake --build build -j4

# === Setup Yzma Library Path ===
mkdir -p ~/yzma-lib
cp build/lib/*.so* ~/yzma-lib/
export YZMA_LIB=~/yzma-lib
echo 'export YZMA_LIB=~/yzma-lib' >> ~/.bashrc

## 9.2 Optimal Run Configuration

The following command represents the fully optimized decode configuration for Qwen3-0.6B on the Arduino Uno Q 4 GB:
./build/bin/llama-cli \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 \                          # All 4 A53 cores
-tb 4 \                         # Batch threads = decode threads
-c 1024 \                       # Short context
--mlock \                       # Prevent page faults
-ctk q8_0 -ctv q8_0 \          # Quantized KV cache
--temp 0.6 \                    # Qwen3-recommended
--top-k 20 --top-p 0.95 \
--min-p 0.0 \                   # Disable min-p (saves cycles)
--repeat-penalty 1.5 \          # Anti-repetition
--no-display-prompt \           # Don't waste time printing prompt
-p "What is the capital of France?"

## 9.3 Benchmarking Protocol

Run structured benchmarks to measure each optimization layer independently:
# Baseline: measure raw decode throughput
./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t 4 -ngl 0 \
-p 64,128,256,512 \             # Multiple prompt lengths
-n 128 \                        # Generate 128 tokens
-r 3                            # 3 repetitions for variance

# Compare thread counts
for t in 1 2 3 4; do
./build/bin/llama-bench \
-m qwen3-0.6b-q4_0-pure.gguf \
-t $t -ngl 0 -p 128 -n 128 -r 3
done

# Compare quantization formats (if multiple available)
for q in q4_0 q4_k_m q8_0; do
./build/bin/llama-bench \
-m qwen3-0.6b-${q}.gguf \
-t 4 -ngl 0 -p 128 -n 128 -r 3
done

# 10. Yzma Go Application Integration

## 10.1 Library Hot-Swap Procedure

Yzma loads llama.cpp shared libraries at runtime via the YZMA_LIB environment variable. The hot-swap process is:
# Point YZMA_LIB to optimized build
export YZMA_LIB=~/yzma-lib

# Verify library is the optimized build
file $YZMA_LIB/libllama.so
# Should show: ELF 64-bit LSB shared object, ARM aarch64

# Run Yzma application
go run ./examples/chat/ \
-model ~/models/qwen3-0.6b-q4_0-pure.gguf

## 10.2 Optimized Yzma Application Code

A production-ready Yzma application with all decode optimizations applied:
package main

import (
"bufio"
"fmt"
"os"
"github.com/hybridgroup/yzma/pkg/llama"
)

func main() {
llama.Load(os.Getenv("YZMA_LIB"))
llama.LogSet(llama.LogSilent())  // Reduce log overhead
llama.Init()

// Model params: no GPU layers for decode-optimized CPU path
mp := llama.ModelDefaultParams()
mp.NGPULayers = 0          // CPU-only decode
mp.UseMmap = true          // Enable memory mapping
mp.UseMlock = true         // Lock pages in RAM

model, _ := llama.ModelLoadFromFile(
"qwen3-0.6b-q4_0-pure.gguf", mp)

// Context params: short context, quantized KV
cp := llama.ContextDefaultParams()
cp.NCtx = 1024
cp.NThreads = 4
cp.NThreadsBatch = 4
cp.FlashAttn = false       // No benefit for CPU decode
// KV cache quant is set via llama.cpp internals

ctx, _ := llama.InitFromModel(model, cp)
vocab := llama.ModelGetVocab(model)

// ... tokenize, batch, and sample loop ...
}

# 11. Expected Performance Outcomes

| **Configuration** | **Decode tok/s** | **TTFT (128-tok prompt)** | **Notes** |
| --- | --- | --- | --- |
| **Ollama + TinyLlama 1.1B Q4_0** | **~5.4** | **~28 sec** | **Baseline measurement** |
| **llama-cli + TinyLlama 1.1B Q4_0 (native build)** | **~6.2–7.0** | **~18–22 sec** | **Ollama overhead removed** |
| **llama-cli + Qwen3-0.6B Q4_0 (native build)** | **~8–10** | **~5–8 sec** | **Model swap + native build** |
| **llama-cli + Qwen3-0.6B Q4_0 (PGO + LTO + tuned)** | **~10–12** | **~4–6 sec** | **Full CPU optimization stack** |
| **Yzma + Qwen3-0.6B Q4_0 (optimized libllama.so)** | **~10–12** | **~4–6 sec** | **Same perf, Go application interface** |
| **+ OpenCL prefill (companion whitepaper)** | **~10–12 (decode unchanged)** | **~1.5–4 sec** | **Prefill accelerated by GPU** |

The key message: decode throughput saturates at **~10–12 tok/s** because this is the physical limit of the ~3.5 GB/s LPDDR4X interface streaming ~340 MB of Q4_0 weights per token. Every optimization beyond this point yields diminishing returns. The combined improvement from the Ollama baseline is **~2.0–2.2×** in decode, with the full **~5–10×** TTFT improvement coming from the companion OpenCL prefill acceleration.

# 12. What True 10× Decode Would Require

For reference, reaching 50+ tok/s decode for Qwen3-0.6B Q4_0 (~340 MB) requires 340 × 50 = 17 GB/s effective read bandwidth. This exceeds the Uno Q’s theoretical peak (14.4 GB/s) and is physically impossible on LPDDR4X. Hardware paths to 50+ tok/s:

| **Platform** | **Memory** | **Effective BW (est.)** | **Projected Qwen3-0.6B Q4_0 tok/s** |
| --- | --- | --- | --- |
| **Arduino Uno Q (current)** | **4 GB LPDDR4X** | **~3.5 GB/s** | **~10–12** |
| **Arduino Ventuno Q (Q2 2026)** | **16 GB LPDDR5** | **~25–35 GB/s** | **~50–80** |
| **Raspberry Pi 5** | **8 GB LPDDR4X-4267** | **~8–12 GB/s** | **~20–30** |
| **NVIDIA Jetson Orin Nano** | **8 GB LPDDR5** | **~50 GB/s (GPU path)** | **~100+** |
| **Apple M-series (baseline)** | **8+ GB LPDDR5/LPDDR5X** | **~50–100 GB/s** | **~150–300** |

The Arduino Ventuno Q, announced March 2026 with a Dragonwing IQ-8275 SoC, 16 GB LPDDR5, and 40 TOPS NPU, is the natural upgrade path within the Arduino ecosystem for users who need higher decode throughput.

# 13. Conclusion

Decode throughput optimization on the Arduino Uno Q is an exercise in engineering within physics constraints. The ~3.5 GB/s effective LPDDR4X memory bandwidth creates an inescapable ceiling that no software optimization can exceed. Within that ceiling, this whitepaper’s seven-layer optimization stack extracts the maximum achievable performance: ~10–14 tok/s for Qwen3-0.6B Q4_0, representing a 2.0–2.6× improvement over the Ollama baseline.
The most impactful optimizations are model selection (1.87× from TinyLlama → Qwen3-0.6B) and Ollama elimination (1.15–1.30× from native build). Compiler tuning, KV cache quantization, context length, and system tuning provide incrementally diminishing but still meaningful gains.
A critical finding for this specific hardware: the **Q4_0_4_4 NEON repack optimization does not work on Cortex-A53** due to the missing SDOT instruction (ARMv8.4-A). Standard Q4_0 with baseline NEON GEMV kernels is the only viable fast path. This limitation does not apply to newer Arduino boards with Cortex-A76+ cores.
When combined with the companion Adreno 702 OpenCL Prefill Acceleration Whitepaper, the total user-experience improvement is transformative: time-to-first-token drops from ~28 seconds to ~2–4 seconds, and sustained generation runs at ~10–12 tok/s — fast enough for real-time text display on embedded interfaces.

# 14. References

llama.cpp Build Documentation: *github.com/ggml-org/llama.cpp/blob/master/docs/build.md*
Yzma Repository and INSTALL.md: *github.com/hybridgroup/yzma*
Cortex-A53 NEON Kernel Optimization: *destevez.net/2025/02/coding-neon-kernels-for-the-cortex-a53/*
Q4_0_4_4 SDOT Requirement (Issue #9853): *github.com/ggml-org/llama.cpp/discussions/9853*
AARCH64 NEON Regression (Issue #10662): *github.com/ggml-org/llama.cpp/issues/10662*
GCC ARM Optimization Flags: *gist.github.com/fm4dd/c663217935dc17f0fc73c9c81b0aa845*
Arduino Uno Q Hardware (Jeff Geerling): *jeffgeerling.com/blog/2025/arduino-uno-q-weird-hybrid-sbc*
Qualcomm Dragonwing QRB2210 Product Brief: *docs.qualcomm.com/bundle/publicresource/87-61720-1*
Qwen3 Technical Report: *arxiv.org/abs/2505.09388*
Adreno 702 OpenCL Prefill Acceleration (Companion Whitepaper): *See separate document*
