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

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 800 (hit limit) |
| Finish reason | `length` |
| TTFT | 36.89s — **7.40 tok/s** |
| Generation | 355.83s — **2.25 tok/s** |
| End-to-end | 392.89s |
| Thinking suppressed | ✓ |
| Swap | 0 |

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

### For-loop structure — ✅ attempted, ❌ broken

The 0.8B model did recognise the for-loop instruction and produced the correct ascending/descending structure:

```cpp
for (int i = 0; i <= 255; i++) { ledColor(i); delay(8); }
for (int i = 255; i >= 0; i--) { ledColor(i); delay(8); }
```

However it wrapped the loops inside a helper function (`ledColor`) that **called itself recursively** — causing infinite recursion and filling all 800 tokens with duplicate function redefinitions. The sketch would crash the MCU at runtime.

### `pinMode` in `setup()` — ❌ missing

`setup()` was not emitted at all. The SOUL.md `pinMode` rule that worked for the 0.6B in v1.2 did not carry over to the 0.8B.

### Root cause

The 0.8B model has a stronger "helper function" instinct than the 0.6B — it attempts to abstract code into functions, which is generally desirable but here produces recursive self-calls. The recursion is a hallucination: `ledColor(int color)` calls `ledColor(i)` inside itself, which the model generates as if the inner call were `analogWrite`. This is a different failure mode from the 0.6B's toggle pattern, but equally incorrect.

---

## Verdict: 0.6B Q4_0 Remains the Better Model for Uno Q

| Criterion | 0.6B Q4_0 | 0.8B Q4_0 |
|---|---|---|
| Generation speed | **3.14–3.64 tok/s** | 2.25 tok/s |
| Completes response | **Yes** (`stop`) | No (hits 800-token cap) |
| `pinMode` correct (with rule) | **Yes** | No |
| For-loop structure | No (toggle) | Yes — but recursive crash |
| Model size on disk | **448 MB** | 490 MB |
| Classroom viability | **Good** (~130s/response) | Poor (~356s/response) |

The 0.8B Q4_0 offers no quality improvement over the 0.6B Q4_0 and is 38% slower. Its for-loop attempt is arguably worse — a sketch that compiles but crashes at runtime is more dangerous than one that blinks instead of fades.

**Active model remains:** `Qwen_Qwen3-0.6B-Q4_0.gguf`

---

## Recommended Next Steps

The for-loop quality issue cannot be resolved by choosing between these two models. The correct path is:

1. **Sketch template injection (Option A from v1.2)** — inject verbatim reference implementations for the 3–5 most common patterns into SOUL.md. The 0.6B model reliably copies verbatim examples even when it cannot generate them from a rule description. Cost: ~50–80 extra prompt tokens per pattern (~4–7s extra TTFT).

2. **Evaluate Qwen3-1.7B-Q4_0** — the next step up in the Qwen3 family (not Qwen3.5). At ~1.1 GB it would decode at ~1.4–1.8 tok/s but has sufficient capacity to follow structural code instructions reliably. Worth benchmarking to establish the quality/speed trade-off.

3. **Clean up systemd unit** — `sudo rm /etc/systemd/system/llama-server.service && sudo systemctl daemon-reload`.
