# Sensai Evaluation — v2 Results

**Date:** 2026-05-04
**Branch:** `sensai`
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X, Adreno 702)
**Model:** Qwen3.5-0.8B-Q4_0
**Tool:** `llama-bench` — 385 prompt tokens, 50 gen tokens, 3 repetitions

This document records the benchmark runs that implement and evaluate the five actions from `sensai-eval-v2.md`.

---

## Action 1 — Vulkan GPU Backend: BLOCKED

**Status:** Hardware/driver incompatible with precompiled llama.cpp Vulkan shaders.

**What was attempted:**
- Installed `llama-b9014-bin-ubuntu-trixie-vulkan-arm64.tar.gz` from `hybridgroup/llama-cpp-builder`
- Vulkan device detected successfully:
  ```
  deviceName = Turnip Adreno (TM) 702 (turnip Mesa driver)
  apiVersion = 1.4.309
  shaderFloat16 = true / shaderInt8 = true
  maxComputeSharedMemorySize = 16384 (16 KB)
  ```
- All attempts to run with `--n-gpu-layers 999` failed:
  ```
  ggml_vulkan: Error: Shared memory size too small for matrix multiplication.
  ```

**Root cause:** llama.cpp's Vulkan matmul shaders require more than 16 KB of compute shared memory per workgroup. The Adreno 702 as exposed by the Turnip (Mesa) open-source driver caps this at 16 KB. The check runs at model load time and blocks inference for any `ngl > 0`. `GGML_VK_DISABLE_COOPMAT=1` and `GGML_VK_DISABLE=1` environment variables do not bypass the check.

**Collateral finding — library version mismatch:** The `yzma install --processor vulkan` tool downloaded a non-trixie binary (`llama-b9014-bin-ubuntu-vulkan-arm64.tar.gz`) rather than the trixie variant. This left the b9014 executables linked against b8263 ggml shared libraries (version 0.9.7 vs 0.10.2), blocking even the CPU path. Fixed by:
1. Manually downloading `llama-b9014-bin-ubuntu-trixie-cpu-arm64.tar.gz` and `llama-b9014-bin-ubuntu-trixie-vulkan-arm64.tar.gz`
2. Extracting both to `yzma/lib/`
3. Updating `libggml.so.0` and `libggml-base.so.0` symlinks to `0.10.2`
4. Removing `libggml-vulkan.so` (since Vulkan is non-functional and its presence blocks CPU loading in b9014's backend scanner)

**Future path for GPU acceleration:**
- Build llama.cpp from source with reduced Vulkan workgroup tile sizes to fit within 16 KB
- Investigate OpenCL 2.0 backend (Adreno 702 supports OpenCL; Qualcomm's proprietary OpenCL stack may be accessible at `/dev/kgsl-3d0`)
- Wait for Turnip driver improvements to expose more shared memory (Mesa upstream development is active)

---

## Unplanned Win — llama.cpp b9014 CPU Improvement

Upgrading from b8263 to b9014 (trixie-cpu-arm64) produced a significant throughput gain with identical flags. This is the primary speed improvement from this session.

### Benchmark: b8263 CPU (old baseline)

```
| qwen35 0.8B Q4_0  | CPU | 4 threads | pp385 |  7.24 ± 0.02 t/s |
| qwen35 0.8B Q4_0  | CPU | 4 threads | tg50  |  2.21 ± 0.02 t/s |
```

### Benchmark: b9014 CPU (new baseline, same flags)

```
| qwen35 0.8B Q4_0  | CPU | 4 threads | pp385 |  9.30 ± 0.09 t/s |
| qwen35 0.8B Q4_0  | CPU | 4 threads | tg50  |  4.15 ± 0.31 t/s |
```

**Δ generation: +88% (2.21 → 4.15 tok/s). Δ prefill: +28% (7.24 → 9.30 tok/s).**

---

## Actions 2–5 — Flag Optimisations

### Action 2: `--ctx-size 4096` (from 12288)

Applied in `scripts/sensai-launch.sh`. Effect on llama-bench throughput: none (bench sets its own context from prompt + gen length). Production effect: KV cache memory drops from ~350 MB to ~117 MB; cold-start TTFT expected to improve proportionally.

### Action 3: `--parallel 1` (from 2)

Applied in `scripts/sensai-launch.sh`. Halves KV cache slot allocation. No throughput impact for single-session use (which is the only scenario this server handles).

### Action 4: `--flash-attn on`

Applied in `scripts/sensai-launch.sh`. Bench impact: negligible on CPU path.

```
| qwen35 0.8B Q4_0  | CPU | 4 threads | fa=1 | pp385 |  9.28 ± 0.10 t/s |
| qwen35 0.8B Q4_0  | CPU | 4 threads | fa=1 | tg50  |  4.13 ± 0.33 t/s |
```

Flash attention is a GPU-side memory optimisation. On the CPU path it has no effect — confirmed by bench. Flag retained because it is the correct setting for any future GPU path.

### Action 5: `-t 2` (GPU path)

Tested. On CPU path, 2 threads is **significantly slower** (tg=2.70 vs 4.15 tok/s). Keeping `-t 4` for the CPU path. This flag only applies when GPU offloads all layers and the CPU handles only sampling; that scenario is blocked until Vulkan or OpenCL is functional.

```
| qwen35 0.8B Q4_0  | CPU | 2 threads | tg50  |  2.70 ± 0.01 t/s |  ← slower, not applied
| qwen35 0.8B Q4_0  | CPU | 4 threads | tg50  |  4.15 ± 0.31 t/s |  ← production
```

---

## Updated `scripts/sensai-launch.sh`

```bash
"$LLAMA_SERVER" \
    -m "$SENSAI_MODEL" \
    --host 127.0.0.1 \
    --port "$LLAMA_PORT" \
    --ctx-size 4096 \          # was 12288 — ~3× KV memory reduction
    --parallel 1 \             # was 2    — halves KV slots
    -t 4 \                     # unchanged — 4 threads optimal on A53 CPU path
    --flash-attn on \          # new      — correct for future GPU path; no CPU cost
    --mlock \                  # unchanged — keeps model pinned in RAM
    --cache-type-k q8_0 \
    --cache-type-v q8_0
```

---

## Cumulative Speed Summary

| Version | Build | Model | Flags | Gen tok/s | Prefill tok/s |
|---|---|---|---|---|---|
| v1 (baseline) | b8263 | 0.8B Q6_K | temp=0.6 | 1.25 | — |
| v1.4 | b8263 | 0.8B Q4_0 | temp=0.1, scaffold | 2.50 | 7.00 |
| v2 CPU baseline | b8263 | 0.8B Q4_0 | bench, 4t | 2.21 | 7.24 |
| **v2 b9014 CPU** | **b9014** | **0.8B Q4_0** | **bench, 4t** | **4.15** | **9.30** |
| v2 GPU target | b9014 | 0.8B Q4_0 | ngl=999, 2t, fa | BLOCKED | BLOCKED |

**Net result from this session:** generation speed doubles (2.21 → 4.15 tok/s) from the llama.cpp version upgrade alone. The Vulkan path remains blocked at the hardware/driver level pending a source build or Turnip driver update.

---

## Next Steps

1. **Investigate OpenCL path** — check `/dev/kgsl-3d0` and Qualcomm's proprietary OpenCL stack. Build llama.cpp from source with `GGML_OPENCL=ON`.
2. **Re-run v1.4 head-to-head with b9014** — both 0.6B and 0.8B under identical conditions to update the model selection recommendation with the new speed numbers.
3. **Monitor Turnip shared memory** — Mesa 25.2+ active development; later driver versions may expose more than 16 KB.
