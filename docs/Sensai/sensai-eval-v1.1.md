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

## v1.1 Benchmark (Qwen3-0.6B-Q4_0 — Measured)

**Date:** 2026-05-04 · Fresh llama-server start, same breathing-LED prompt as v1 (102 prompt tokens).

| Metric | v1 (Q6_K) | v1.1 (Q4_0) | Improvement |
|---|---|---|---|
| Prompt tokens | 92 | 102 | — |
| Completion tokens | 400 (hit limit) | 454 | Completed naturally |
| Finish reason | `length` | `stop` | ✓ |
| TTFT | 16.02s — 5.74 tok/s | 7.66s — 13.31 tok/s | **2.1× faster** |
| Generation | 319.43s — 1.25 tok/s | 124.61s — **3.64 tok/s** | **2.9× faster** |
| End-to-end | 335.45s | 132.39s | **2.5× faster** |
| Thinking suppressed | ✓ | ✓ | — |
| Swap | 0 | 0 | — |

3.64 tok/s is within the projected 3.5–6 tok/s range. The model completes the response naturally (finish_reason `stop`) and no longer truncates at the token cap.

### max_tokens raised to 800

`config/sensai.config.json` and `~/.picoclaw/config.json` updated from 4096/1024 → **800**. With Q4_0 at 3.64 tok/s, an 800-token response takes ~220s — acceptable for a single student session. The 454-token breathing-LED response completed in 132s.

### Quality: breathing LED pattern still incorrect

The 0.6B model continues to generate a toggle (write 255, write 0) rather than ascending/descending `for` loops, despite explicit SOUL.md rules. The issue is a fundamental capacity limitation of the 0.6B parameter count — the model pattern-matches "toggle" for any LED task and does not reliably follow multi-step format constraints.

**`pinMode` is now correct** (the SOUL.md rule fixed that regression).

The for-loop issue requires either a larger model (1.7B+ would likely resolve it) or a sketch template injected into the system prompt for common patterns. Documented as an open issue.

---

## SOUL.md Updates (2026-05-04)

Two pattern rules added to `~/.picoclaw/workspace/SOUL.md`:

**In "What You Know":**
```
- Breathing/fading LED pattern — ALWAYS use analogWrite inside ascending then
  descending for loops:
    for (int i = 0; i <= 255; i++) { analogWrite(pin, i); delay(8); }
    for (int i = 255; i >= 0; i--) { analogWrite(pin, i); delay(8); }
  Never toggle between 255 and 0 — that is a blink, not a fade.
```

**In "Rules":**
```
- ALWAYS include `pinMode(<pin>, OUTPUT)` in `setup()` for every pin used with
  `analogWrite` or `digitalWrite`. An empty `setup()` is a bug.
- Breathing/fading LED = analogWrite in ascending then descending for loops.
  A boolean toggle is a blink, not a fade — never confuse the two.
```

---

## Recommended Next Steps

1. **Sketch template injection** — for common patterns (breathing LED, blink, button debounce), inject a reference implementation into the system prompt. Bypasses the 0.6B model's unreliable instruction following for structural code patterns.
2. **Test 1.7B model** — bartowski's `Qwen_Qwen3-1.7B-Q4_0.gguf` (~1 GB) would reach ~1.5–2 tok/s but should reliably follow for-loop instructions. Trade-off: 3–4× slower generation.
3. **Clean up systemd unit** — `/etc/systemd/system/llama-server.service` still references the old AI Town embedding config: `sudo rm /etc/systemd/system/llama-server.service`.
