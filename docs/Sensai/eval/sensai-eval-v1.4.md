# Sensai Evaluation — v1.4

**Date:** 2026-05-04
**Branch:** `sensai`
**Config:** temp=0.1, max_tokens=800, scaffold template in SOUL.md
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X)

This document supersedes v1.3. It adds the 0.6B Q4_0 scaffold benchmark and provides a definitive head-to-head comparison of both models under identical conditions (same prompt, same temperature, same scaffold template, fresh server start).

---

## Test Conditions

Both models run with:
- `--ctx-size 12288 --parallel 2 -t 4 --mlock --cache-type-k q8_0 --cache-type-v q8_0`
- Temperature: **0.1**
- max_tokens: **800**
- System prompt: SOUL.md rules + canonical scaffold + breathing LED template (406 tokens for 0.8B, 385 tokens for 0.6B — minor variance from tokeniser differences)
- Fresh server restart before run 1 of each model

---

## 0.6B Q4_0 + Scaffold Benchmark

### Run 1 (fresh server)

| Metric | Value |
|---|---|
| Prompt tokens | 385 |
| Completion tokens | 212 |
| Finish reason | `stop` |
| TTFT | 39.22s — **9.82 tok/s** |
| Generation | 138.33s — 1.53 tok/s |
| End-to-end | 177.70s |

### Run 2 (same server — prompt cache hit)

| Metric | Value |
|---|---|
| Prompt tokens | 385 |
| Completion tokens | 234 |
| Finish reason | `stop` |
| TTFT | **0.64s** — 1.56 tok/s (KV prompt cache) |
| Generation | 123.84s — 1.89 tok/s |
| End-to-end | 124.60s |

**Note on run 2 TTFT:** llama.cpp caches computed KV states for prompt prefixes across requests. When the same system prompt is sent again, the prefill is skipped entirely — 0.64s vs 39.22s. In production, after the first user interaction the server is warm and subsequent requests from the same session have near-zero TTFT. This is a meaningful production advantage.

### Response (identical across both runs)

```cpp
void setup() {
    pinMode(9, OUTPUT);
}

void loop() {
    for (int i = 0; i <= 255; i++) {
        analogWrite(9, i);
        delay(8);
    }
    for (int i = 255; i >= 0; i--) {
        analogWrite(9, i);
        delay(8);
    }
}
```

✅ Correct scaffold · ✅ `pinMode` in `setup()` · ✅ Ascending/descending `analogWrite` loops · ✅ Compilable

**Explanation quality:** the model mislabels the for-loops as "blink" in the commentary ("simulating a blink (fading in)") even though the code correctly implements a fade. The code path and comment path remain somewhat decoupled at 0.6B. Not a functional issue — students will see the correct behaviour on the board.

---

## Head-to-Head: 0.6B Q4_0 vs 0.8B Q4_0 (temp=0.1, scaffold, fresh server)

| Criterion | 0.6B Q4_0 | 0.8B Q4_0 |
|---|---|---|
| Model file size | **385 MB** | 490 MB |
| Prompt tokens (with scaffold) | **385** | 406 |
| TTFT (fresh) | **39.22s — 9.82 tok/s** | 58.03s — 7.00 tok/s |
| TTFT (warm/cached) | **0.64s** | ~1s (expected) |
| Generation speed (fresh) | 1.53 tok/s | **2.50 tok/s** |
| Generation speed (warm) | 1.89 tok/s | **1.80 tok/s** |
| Correct for-loops | ✅ | ✅ |
| `setup()`/`loop()` scaffold | ✅ | ✅ |
| `pinMode` correct | ✅ | ✅ |
| Compilable | ✅ | ✅ |
| Explanation accuracy | Mislabels loops as "blink" | Accurate |
| End-to-end (fresh, run 1) | 177.70s | **135.46s** |
| End-to-end (warm, run 2) | **124.60s** | 166.19s |

---

## Key Findings

### 1. Scaffold template fixes both models equally

With the canonical scaffold in SOUL.md, **both models produce identical, compilable sketches** at temp=0.1. The quality gap between them (which drove much of v1.2–v1.3) is eliminated by the prompt engineering fix.

### 2. Generation speed reversal at large prompt sizes

Without scaffold (~100-token prompt): **0.6B was faster** (3.64 vs 2.25 tok/s).  
With scaffold (~385–406 token prompt): **0.8B is faster** (2.50 vs 1.53 tok/s fresh).

**Why:** the larger prompt creates more KV entries that must be loaded per decode step. The 0.6B's smaller weight matrix saves bandwidth on the weight read, but both models now pay a larger KV read cost per token (~385 × 6 KB = 2.3 MB vs ~102 × 6 KB = 0.6 MB at q8_0). At this KV footprint the 0.8B's architecture amortises the fixed decode overhead slightly better — likely due to wider attention heads processing more information per layer traversal.

### 3. KV prompt cache is a meaningful production feature

On run 2, the 0.6B's TTFT dropped from 39s to 0.64s because llama.cpp reused the cached KV states for the identical system prompt prefix. In a real classroom session where multiple students send different questions with the same SOUL.md prefix, every request after the first benefits from this. Effectively: **cold start costs 39–58s; warm requests are near-instant on TTFT**.

### 4. TTFT advantage stays with 0.6B on fresh starts

The 0.6B processes 385 tokens in 39s (9.82 tok/s prefill) vs the 0.8B's 406 tokens in 58s (7.00 tok/s prefill). First-message latency is meaningfully better with the 0.6B.

---

## Cumulative Benchmark Summary

| Version | Model | Temp | Scaffold | Gen tok/s | TTFT | Sketch correct |
|---|---|---|---|---|---|---|
| v1 | 0.8B Q6_K | 0.6 | No | 1.25 | 16s | ❌ |
| v1.1 | 0.6B Q4_0 | 0.6 | No | 3.64 | 7.7s | ❌ |
| v1.2 | 0.6B Q4_0 | 0.6 | No | 3.14 | 22s | ❌ |
| v1.3 r1–3 | 0.8B Q4_0 | 0.6 | No | 1.89–2.25 | 37–45s | ❌ |
| v1.3 r4–5 | 0.8B Q4_0 | **0.1** | No | 1.86–2.24 | 41s | ❌ (global scope) |
| v1.3 r6–7 | 0.8B Q4_0 | **0.1** | **Yes** | 1.80–2.50 | 58s | ✅ |
| **v1.4 r1–2** | **0.6B Q4_0** | **0.1** | **Yes** | **1.53–1.89** | **39s / 0.6s** | **✅** |

---

## Verdict

Both models now produce correct output under the same config. The choice reduces to a speed trade-off:

- **0.6B Q4_0:** faster TTFT on cold start (39s vs 58s), faster warm TTFT via prompt cache (0.6s), smaller on disk. Slower generation with large prompts (1.53 tok/s). Explanation text occasionally inaccurate.
- **0.8B Q4_0:** faster generation with large prompts (2.50 tok/s fresh), more accurate explanations. Slower cold TTFT (58s).

**For classroom use (single active session, warm server after first request):** 0.6B Q4_0 — warm TTFT near zero, generation comparable, smaller footprint.

**For Telegram/gateway use (cold start per message, no session warmth):** 0.8B Q4_0 — faster generation offsets the TTFT cost when the server is cold per request.

---

## Recommended Next Steps

1. **Add blink and button debounce templates to SOUL.md** — extend the canonical patterns section to cover the next two most common requests.
2. **Set active model based on deployment mode** — classroom terminal → 0.6B; Telegram gateway → 0.8B.
3. **Clean up systemd unit** — `sudo rm /etc/systemd/system/llama-server.service && sudo systemctl daemon-reload`.
