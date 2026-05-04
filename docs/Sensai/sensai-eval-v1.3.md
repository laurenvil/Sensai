# Sensai Evaluation — v1.3

**Date:** 2026-05-04
**Branch:** `sensai`
**Model tested:** Qwen3.5-0.8B-Q4_0 (bartowski) · `--ctx-size 12288 --parallel 2 -t 4 --mlock --cache-type-k q8_0 --cache-type-v q8_0`
**Baseline:** Qwen3-0.6B-Q4_0 (v1.1/v1.2)
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X)

This document covers the Qwen3.5-0.8B-Q4_0 candidate evaluation. All prior changes (model flags, max_tokens=800, SOUL.md rules) carry forward unchanged.

---

## Model Under Test

Downloaded from `bartowski/Qwen_Qwen3.5-0.8B-GGUF` → `Qwen_Qwen3.5-0.8B-Q4_0.gguf`.

| Aspect | Qwen3-0.6B-Q4_0 (current) | Qwen3.5-0.8B-Q4_0 (candidate) |
|---|---|---|
| Parameters | 0.6B | 0.8B |
| File size | 448 MB | 490 MB |
| Bytes read per decode token | ~454 MB | ~496 MB |
| Model series | Qwen3 | Qwen3.5 |
| Architecture difference | — | More layers/heads than 0.6B |

---

## v1.3 Benchmark

**Prompt:** breathing LED on pin 9 + SOUL.md rules inline (same as v1.2 quality benchmark).

### Run 1

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 800 (hit limit) |
| Finish reason | `length` |
| TTFT | 36.89s — 7.40 tok/s |
| Generation | 355.83s — **2.25 tok/s** |
| End-to-end | 392.89s |
| Thinking suppressed | ✓ |
| Swap | 0 |

### Run 2

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 208 |
| Finish reason | `stop` |
| TTFT | 40.18s — 6.80 tok/s |
| Generation | 98.98s — **2.10 tok/s** |
| End-to-end | 139.38s |
| Thinking suppressed | ✓ |
| Swap | 0 |

### Speed summary across both runs

Generation speed is consistent: **2.10–2.25 tok/s**. TTFT varies slightly (6.80–7.40 tok/s prefill) due to KV cache state between runs.

---

## Full Benchmark Comparison

| Metric | v1 (0.8B Q6_K) | v1.1 (0.6B Q4_0) | v1.2 (0.6B Q4_0 + rules) | **v1.3 (0.8B Q4_0)** |
|---|---|---|---|---|
| Model size | 637 MB | 448 MB | 448 MB | 490 MB |
| Prompt tokens | 92 | 102 | 265 | 273 |
| Completion tokens | 400 (limit) | 454 | 228 | 800 (limit) |
| Finish reason | `length` | `stop` | `stop` | `length` |
| TTFT | 16.02s — 5.74 tok/s | 7.66s — 13.31 tok/s | 21.99s — 12.05 tok/s | 36.89s — 7.40 tok/s |
| Generation | 319.43s — 1.25 tok/s | 124.61s — **3.64 tok/s** | 72.55s — **3.14 tok/s** | 355.83s — 2.25 tok/s |
| `pinMode` in setup() | No | No | Yes | No |
| For-loops used | No | No | No | Yes — broken (recursive) |

---

## Speed Analysis

The 0.8B Q4_0 is **slower than the 0.6B Q4_0** on the A53:

**Why:** both models use Q4_0 (same dequant cost per weight block), but the 0.8B has a larger weight matrix — ~10% more bytes per forward pass at the same quantization level. That alone does not account for the full gap. The bigger contributor is architecture: Qwen3.5-0.8B has more layers and wider attention than Qwen3-0.6B. More layers = more sequential NEON dequant passes per token on the in-order A53. The result is 2.25 vs 3.64 tok/s — a **38% penalty** for 33% more parameters.

**TTFT regression:** 36.89s at 273 tokens = 7.40 tok/s prefill (vs 12.05 tok/s for 0.6B at 265 tokens). The prefill is compute-bound for the same reason — more transformer layers to process per token.

---

## Quality Analysis

The 0.8B Q4_0 produced different broken output on each run — indicating high output variance in addition to incorrect results.

### Run 1 — For-loop structure attempted, but recursive crash

The model recognised the for-loop instruction and produced the correct ascending/descending structure, but wrapped it inside a helper function (`ledColor`) that **called itself recursively**, filling all 800 tokens with duplicate redefinitions. The sketch would crash the MCU at runtime with a stack overflow.

```cpp
// What it produced (simplified):
void ledColor(int color) {
    for (int i = 0; i <= 255; i++) { ledColor(i); delay(8); }  // ← calls itself
    for (int i = 255; i >= 0; i--) { ledColor(i); delay(8); }
}
```

### Run 2 — Hallucinated libraries, global-scope code

The model invented non-existent libraries (`LedLed.h`, `Diod.h`) and placed `pinMode` and `analogWrite` at global scope outside any function — code that will not compile:

```cpp
#include <LedLed.h>   // does not exist
#include <Diod.h>      // does not exist

pinMode(9, OUTPUT);    // ← global scope, invalid C++
analogWrite(9, 255);   // ← global scope, invalid C++

Diod ledLED(9, 10);    // hallucinated object
```

No `setup()` or `loop()` functions were emitted at all.

### `pinMode` in `setup()` — ❌ missing in both runs

The SOUL.md `pinMode` rule that resolved this for the 0.6B in v1.2 had no effect on the 0.8B.

### Root cause

Two distinct failure modes across two runs indicates the 0.8B model has **high output variance** on structured code tasks — its temperature-sampled outputs are not converging on a stable (even if wrong) pattern the way the 0.6B's toggle does. The hallucinated libraries in run 2 are a particularly concerning sign: the model is fabricating APIs rather than using real Arduino functions. This is worse than a structural error.

---

## Verdict: 0.6B Q4_0 Remains the Better Model for Uno Q

| Criterion | 0.6B Q4_0 | 0.8B Q4_0 |
|---|---|---|
| Generation speed | **3.14–3.64 tok/s** | 2.10–2.25 tok/s |
| Completes response | **Yes** (`stop`) | Inconsistent (1× limit, 1× stop) |
| `pinMode` correct (with rule) | **Yes** | No (both runs) |
| For-loop structure | No (consistent toggle) | Run 1: recursive crash · Run 2: hallucinated libs |
| Output consistency | **Stable failure mode** | High variance — different bug each run |
| Model size on disk | **448 MB** | 490 MB |
| Classroom viability | **Good** (~130s/response) | Poor (~245s avg, unpredictable output) |

The 0.8B Q4_0 is slower, larger, and produces inconsistent output — different broken code each run. The 0.6B Q4_0's consistent toggle is a better-defined failure: predictable, safe (won't crash the MCU), and targetable with a template fix. The 0.8B's hallucinated libraries are a harder problem to mitigate.

**Active model remains:** `Qwen_Qwen3-0.6B-Q4_0.gguf`

---

## Recommended Next Steps

The for-loop quality issue cannot be resolved by choosing between these two models. The correct path is:

1. **Sketch template injection (Option A from v1.2)** — inject verbatim reference implementations for the 3–5 most common patterns into SOUL.md. The 0.6B model reliably copies verbatim examples even when it cannot generate them from a rule description. Cost: ~50–80 extra prompt tokens per pattern (~4–7s extra TTFT).

2. **Evaluate Qwen3-1.7B-Q4_0** — the next step up in the Qwen3 family (not Qwen3.5). At ~1.1 GB it would decode at ~1.4–1.8 tok/s but has sufficient capacity to follow structural code instructions reliably. Worth benchmarking to establish the quality/speed trade-off.

3. **Clean up systemd unit** — `sudo rm /etc/systemd/system/llama-server.service && sudo systemctl daemon-reload`.
