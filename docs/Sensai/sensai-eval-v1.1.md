# Sensai Evaluation — v1.1

**Date:** 2026-05-04
**Branch:** `sensai`
**Model (v1):** Qwen3.5-0.8B-Q6_K · `--ctx-size 12288 --parallel 2`
**Model (v1.1):** Qwen3-0.6B-Q4_0 (bartowski) · `--ctx-size 12288 --parallel 2 -t 4 --mlock --cache-type-k q8_0 --cache-type-v q8_0`
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X)

This document supersedes v1. It incorporates the generation speed deep-dive, corrects the initial KV-cache saturation hypothesis, and documents the model switch and launch-flag improvements implemented as a result.

---

## v1 Benchmark (Qwen3.5-0.8B-Q6_K)

| Metric | Value |
|---|---|
| Prompt tokens | 92 |
| Completion tokens | 400 (hit limit) |
| Prompt eval (TTFT) | 16.02s — 5.74 tok/s |
| Generation | 319.43s — **1.25 tok/s** |
| End-to-end | 335.45s |
| Thinking suppressed | ✓ (via `chat_template_kwargs`) |
| Swap (server process) | 0 (VmSwap: 0 confirmed) |
| Finish reason | `length` |

---

## Generation Speed Analysis

### Initial hypothesis vs. what the data shows

The v1 doc described the slowdown as "KV cache grows from ~100 to ~500 entries and saturates the LPDDR4X memory bus." That framing was **incorrect**. The data rules it out:

**KV cache per token** (Qwen3.5-0.8B, 24 layers, 2 GQA KV heads, 64 head-dim, fp16):
```
24 × 2 × 2 × 64 × 2 bytes = 12,288 bytes = 12 KB/token
At 492 tokens: 492 × 12 KB = 5.8 MB active KV data
```

**Bandwidth per generated token:**
```
Model weights (Q6_K):  655 MB
KV cache (492 tokens):   5.8 MB
Total per token read:  ~661 MB

Measured at 1.25 tok/s → 0.8s/token → effective throughput = 826 MB/s
LPDDR4X theoretical peak: 3,500 MB/s
Utilisation: 23.6%
```

At **23.6% of peak bandwidth**, the memory bus is not saturated. The bottleneck is CPU compute.

### Root cause: Q6_K dequantization on `libggml-cpu-armv8.0_1.so`

The loaded CPU backend is `libggml-cpu-armv8.0_1.so` — the baseline ARMv8.0 path. The Cortex-A53 is an **in-order, 2-wide** processor. Its NEON pipeline cannot reorder or speculate around compute stalls. Q6_K stores weights in a complex bit-packed format requiring multiple NEON shuffle-and-mask operations per 256-weight block to dequantize. On an out-of-order core (A72, A78, X1) this overhead is hidden in the pipeline; on the A53 it serialises.

Hardware state confirmed during benchmark:
- All 4 cores at full 2016 MHz (no thermal throttling; package temp 40–45°C)
- VmSwap: 0 — model fully resident in RAM
- llama-server spawning 10 OS threads; default generation threads = 4 (hardware_concurrency)
- CPU% during 400-token generation: ~95% (one core fully serialised on NEON dequant)

**Why 10 tokens ran at 5.94 tok/s but 400 tokens ran at 1.25 tok/s:** After prompt evaluation, the model weight pages for the first few transformer layers are still warm in each core's 512 KB L2 cache. The first ~10–20 tokens benefit from cache-hot dequantization. Past ~50 tokens, the 655 MB working set far exceeds L2 and every token requires a fresh 655 MB traversal of cold DRAM — at 826 MB/s effective throughput (0.8s/token).

### Does `--parallel 2` contribute?

Indirectly, but it is not the root cause.

`--parallel 2` allocates KV cache for two request slots upfront: 2 × 12,288 × 12 KB = **288 MB** (vs 144 MB with `--parallel 1`). For a single active request, only that sequence's ~5.8 MB of active KV entries is read per forward pass. The second slot's allocation is resident in DRAM but not accessed during decode. The 144 MB overhead increases total DRAM pressure and slightly reduces the portion of model weight pages that can reside in OS page cache — a minor effect, not the 4.7× difference observed.

### Optimisation ranking

| Priority | Change | Expected sustained tok/s | Rationale |
|---|---|---|---|
| **1 — implemented** | Switch to Qwen3-0.6B-Q4_0 | **3.5–6 tok/s** | 385 MB model (vs 655 MB), Q4_0 nibble-unpack ~2–2.5× faster to dequantize on A53 NEON |
| **2 — implemented** | Add `--mlock` | +0–0.5 tok/s | Locks weight pages in RAM; prevents eviction under memory pressure |
| **3 — implemented** | Add `-t 4` explicitly | +0–0.3 tok/s | Default `-1` selects 4 cores; explicit flag ensures it under all kernel schedulers |
| **4 — implemented** | `--cache-type-k q8_0 --cache-type-v q8_0` | +0.1–0.3 tok/s | Halves KV bandwidth (5.8 MB → 2.9 MB at 492 tokens) |
| 5 | Reduce `--parallel 1` for single-user | +0–0.2 tok/s | Saves 144 MB KV allocation; use `--parallel 2` for classroom |
| 6 | Adreno 702 OpenCL prefill build | TTFT only (5–13×) | Requires llama.cpp built with OpenCL; decode speed is memory/compute-bound, unchanged |

---

## Changes Implemented

### 1. Model: Qwen3.5-0.8B-Q6_K → Qwen3-0.6B-Q4_0

Downloaded from `bartowski/Qwen_Qwen3-0.6B-GGUF` — `Qwen_Qwen3-0.6B-Q4_0.gguf` (385 MB).

| Aspect | Q6_K (v1) | Q4_0 (v1.1) |
|---|---|---|
| Model | Qwen3.5-0.8B | Qwen3-0.6B |
| File size | 655 MB | 385 MB |
| Bytes read per token | ~661 MB | ~391 MB |
| Dequant cost (A53 NEON) | High (complex bit-shuffle) | Low (4-bit nibble unpack) |
| Expected sustained tok/s | 1.25 tok/s (measured) | 3.5–6 tok/s (projected) |
| Whitepaper ceiling | — | ~10 tok/s |
| Quality for short coding tasks | High | Sufficient |

### 2. llama-server launch flags updated

`scripts/sensai-launch.sh` — updated flags:

```bash
"$LLAMA_SERVER" \
    -m "$SENSAI_MODEL" \
    --host 127.0.0.1 \
    --port "$LLAMA_PORT" \
    --ctx-size 12288 \
    --parallel 2 \
    -t 4 \
    --mlock \
    --cache-type-k q8_0 \
    --cache-type-v q8_0
```

### 3. Model default updated in three places

| File | Change |
|---|---|
| `scripts/sensai-launch.sh` | `SENSAI_MODEL` default → `Qwen_Qwen3-0.6B-Q4_0.gguf` |
| `Makefile` | `SENSAI_MODEL` default → `Qwen_Qwen3-0.6B-Q4_0.gguf` |
| `config/sensai.config.json` | `model_name` → `Qwen_Qwen3-0.6B-Q4_0.gguf` |

---

## Response Quality Issues (from v1, unresolved)

### Issue 1 — Wrong sketch: LED toggle instead of PWM fade

The model generated a boolean `isOn` toggle with no `analogWrite` call. A breathing LED requires:

```cpp
void loop() {
    for (int i = 0; i <= 255; i++) { analogWrite(9, i); delay(8); }
    for (int i = 255; i >= 0; i--) { analogWrite(9, i); delay(8); }
}
```

**Fix:** Add explicit pattern rule to SOUL.md: "breathing/fading LED = `analogWrite` in ascending/descending `for` loops."

### Issue 2 — Missing `pinMode` in `setup()`

`setup()` was empty; `pinMode(9, OUTPUT)` not emitted.

**Fix:** Add rule to SOUL.md: "always include `pinMode(<pin>, OUTPUT)` in `setup()` for every pin used with `analogWrite` or `digitalWrite`."

---

## Setup Issues Resolved (carry-forward from v1)

| Issue | Resolution |
|---|---|
| `/no_think` in system prompt text does not suppress Qwen3 reasoning via REST API | `chat_template_kwargs: {"enable_thinking": false}` in `extra_body`; new `ExtraBody` field in `ModelConfig` + `WithExtraBody` option in `openai_compat` provider |
| AI Town `llama-server.service` competing on same port via `SO_REUSEPORT` | `sudo systemctl disable --now llama-server` |
| Go 1.24.4 on board; branch requires 1.25.7+ | Go 1.26.2 installed to `~/go-installs/go/` |
| `yzma/lib/` empty after submodule init | Symlinked from `/home/arduino/ArduinoApps/yzma/lib/` |

---

## Recommended Next Steps

1. **Run v1.1 benchmark** — start fresh server with new model and flags, repeat the 400-token prompt, confirm 3.5–6 tok/s sustained.
2. **Tune SOUL.md** — add PWM breathing pattern and `pinMode` boilerplate rules.
3. **Raise `max_tokens`** to 600–800 in config — 400 tokens truncates a sketch + explanation.
4. **Clean up systemd unit** — `/etc/systemd/system/llama-server.service` still references the old AI Town embedding config: `sudo rm /etc/systemd/system/llama-server.service`.
