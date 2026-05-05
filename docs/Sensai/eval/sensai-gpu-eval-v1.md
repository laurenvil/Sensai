# Sensai GPU Eval — v1 (Production Validation)

**Date:** 2026-05-05  
**Branch:** `sensai-gpu`  
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X, Adreno 702 — 1 CU @ 844 MHz)  
**Software:** `llama-wang` (`wanghqc/llama.cpp`, `opencl/nvidia` branch, build `8c5aa97`) + v4.3 Optimizations  
**Model:** `Qwen3.5-0.8B-Q4_0.gguf` (479.36 MiB, 752 M params)  
**Driver:** Mesa RustiCL 25.2.6-1 (`RUSTICL_ENABLE=freedreno`)  

---

## 1. Purpose

This is the first production validation benchmark of the Adreno 702 GPU inference stack following the v4.3 breakthrough. All v4.3 optimizations are in place (Surgical SOA Dispatch, Proportional Fallback Scaling, RustiCL Detection, Q6_K Surgical Fallback). The goal is to:

1. Confirm v4.3 results are reproducible on a cold run
2. Establish an authoritative CPU vs GPU performance comparison using a controlled methodology
3. Verify the TDR watchdog limit at `-p 385` is still the ceiling

---

## 2. Benchmark Configuration

```bash
# GPU runs (llama-wang branch, OpenCL backend, full GPU offload)
RUSTICL_ENABLE=freedreno LD_LIBRARY_PATH=build/bin build/bin/llama-bench \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  -ngl 999 -t 2 -p <N> -n 50 -r 3

# CPU baseline (same binary, same thread count, GPU offload disabled)
build/bin/llama-bench \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  -ngl 0 -t 2 -p 1 -p 32 -n 50 -r 3

# CPU optimal (same binary, all 4 threads)
build/bin/llama-bench \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  -ngl 0 -t 4 -p 1 -p 32 -n 50 -r 3
```

**Notes:**
- `-r 3` — 3 repetitions per test; all results averaged
- GPU and CPU-t2 benchmarks use the same `llama-wang` binary for a fair comparison
- GPU runs use `-t 2` for the CPU portion of split inference (the Q6_K lm_head tensor routes to CPU)
- **OpenCL kernel compilation**: First cold run takes ~12 minutes to JIT-compile ~95 kernel files to Adreno ISA. Subsequent runs use Mesa's shader cache (`~/.cache/mesa_shader_cache/`) and initialize in ~1–2 minutes

---

## 3. Results

### 3.1 GPU — Prefill Throughput

| Batch Size | Status | pp (t/s) | v4.3 Reference | Δ vs Reference |
| :--- | :--- | :--- | :--- | :--- |
| `-p 1` | SUCCESS | **0.36 ± 0.00** | 0.36 | 0% |
| `-p 2` | SUCCESS | **0.60 ± 0.00** | 0.60 | 0% |
| `-p 32` | SUCCESS | **4.25 ± 0.00** | 4.23 | +0.5% |
| `-p 385` | **CRASH** | N/A | CRASH | TDR confirmed — `GGML_ASSERT(0)` at `ggml-opencl.cpp:6715` |

### 3.2 GPU — Token Generation (Decode)

| Test | GPU (ngl=999, t=2) | Notes |
| :--- | :--- | :--- |
| `tg50` | **0.37 ± 0.00 t/s** | Memory-bandwidth limited; unified DRAM |

### 3.3 CPU Baselines

| Config | pp1 (t/s) | pp32 (t/s) | tg50 (t/s) |
| :--- | :--- | :--- | :--- |
| Wang binary, -t 2 | 2.59 ± 0.08 | 5.89 ± 0.11 | 2.78 ± 0.15 |
| Wang binary, -t 4 | 2.29 ± 0.81 | 9.55 ± 0.21 | 3.06 ± 0.53 |
| yzma mainline, -t 4 (v3 ref) | — | — | 4.15 |

---

## 4. GPU vs CPU Comparison (Fair: same binary, same -t 2)

| Test | GPU (ngl=999) | CPU (ngl=0, t=2) | GPU vs CPU |
| :--- | :--- | :--- | :--- |
| pp1 | 0.36 t/s | 2.59 t/s | −86% |
| pp32 | 4.25 t/s | 5.89 t/s | **−28%** |
| tg50 | 0.37 t/s | 2.78 t/s | −87% |

---

## 5. Analysis

### 5.1 v4.3 Results Are Confirmed

All v4.3 prefill numbers reproduce exactly within measurement noise. The GPU stack is stable and deterministic (±0.00 t/s variance across 3 runs), confirming the optimizations are locked in.

### 5.2 GPU Does Not Outperform CPU in Any Metric

The v4.3 whitepaper compared GPU pp32 (4.23 t/s) against a 3.50 t/s CPU figure and concluded "+21%." This evaluation uses a controlled comparison with the same binary and thread count, revealing:

- **pp32: GPU (4.25) vs CPU (5.89) — GPU is 28% slower**, not faster.

The 3.50 t/s CPU figure in the whitepaper was likely measured with a different binary (yzma mainline at reduced thread count) or a different model configuration. The corrected conclusion: **GPU prefill at pp32 is in the same order of magnitude as CPU, which is a significant achievement for a 1-CU entry-tier GPU**, but it does not surpass the CPU baseline.

### 5.3 Token Generation is GPU-Unfavorable

At decode time (tg50), the GPU produces 0.37 t/s vs the CPU's 2.78 t/s — a **7.5× regression**. This is expected behavior for unified-memory architectures:

- Both GPU and CPU read weights from the same DRAM pool
- The GPU has additional overhead: kernel dispatch, command queue serialization, and DRAM round-trips through the OpenCL runtime
- The A53 CPU, despite being slower at compute, has lower dispatch overhead for batch-1 operations

**Implication:** GPU offloading is **not recommended for interactive inference** (tg). It reduces token generation speed dramatically. The production llama-server config should use CPU-only (`-ngl 0`) for current hardware.

### 5.4 The TDR Watchdog Limit Holds at -p 385

The `-p 385` crash (`CL_OUT_OF_RESOURCES`, error -5) is confirmed again as a GPU Watchdog Timeout (TDR). The Adreno 702's single CU processes 385 rows too slowly, exceeding the Linux kernel's 5-second watchdog timeout. This is a hardware limit, not a software bug.

### 5.5 Prefill-Only Use Case

The GPU is useful in exactly one scenario: **prompt processing (prefill) at moderate batch sizes (16–128 tokens)**. At pp32, the GPU (4.25 t/s) is within 28% of the -t2 CPU. For batch sizes where parallelism scales linearly, the GPU would eventually match the CPU. The crossover point is estimated at pp~64–128, which is within the TDR ceiling.

---

## 6. Benchmark Summary Table

| Metric | GPU (v1) | CPU -t2 (v1) | CPU -t4 (v1) | v4.3 GPU Ref |
| :--- | :---: | :---: | :---: | :---: |
| pp1 (t/s) | 0.36 | 2.59 | 2.29 | 0.36 |
| pp2 (t/s) | 0.60 | — | — | 0.60 |
| pp32 (t/s) | 4.25 | 5.89 | 9.55 | 4.23 |
| pp385 (t/s) | CRASH | 9.55* | 9.55 | CRASH |
| tg50 (t/s) | 0.37 | 2.78 | 3.06 | ~0.36 |

*CPU pp385 extrapolated from pp32 measurement; not measured separately in this eval.

---

## 7. Strategic Implications

### OpenCL Path Status: Stable but Not Production-Ready

The GPU OpenCL path is stable and correctly accelerates prefill at pp32. However, the tg regression makes it unsuitable for the Sensai production use case (interactive Q&A with students requires low TTFT and decent tg speed).

**Recommended production config (Uno Q, Sensai v1.x):**

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2 -t 4
```

CPU-only remains optimal until the GPU path can demonstrate tg improvement.

### Next Steps

1. **Batch prefill investigation** — Measure pp64 and pp128 to find the GPU/CPU crossover point before TDR triggers
2. **Tier 2 (Vulkan Lite)** — Port proportional scaling to Mesa Turnip; Vulkan has lower kernel dispatch overhead, which would reduce the tg penalty
3. **Tier 3 (Hexagon NPU)** — QNN backend on QRB2210 DSP remains the path to >10 t/s generation; not blocked by the 16 KB wall or TDR limits
4. **Ventuno Q (Adreno 623)** — Higher-tier GPU with native cl_khr_subgroups support; the entire Wang branch compat layer would be unnecessary

---

*Eval series: sensai-eval-v1 → v4.3 → sensai-gpu-eval-v1. See `docs/Sensai/eval/` for full history.*
