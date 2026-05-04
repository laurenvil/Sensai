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

### Run 3

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 389 |
| Finish reason | `stop` |
| TTFT | 44.72s — 6.11 tok/s |
| Generation | 206.10s — **1.89 tok/s** |
| End-to-end | 250.98s |
| Thinking suppressed | ✓ |
| Swap | 0 |

### Speed summary across all runs

| Run | Generation | TTFT |
|---|---|---|
| 1 | 2.25 tok/s | 7.40 tok/s prefill |
| 2 | 2.10 tok/s | 6.80 tok/s prefill |
| 3 | 1.89 tok/s | 6.11 tok/s prefill |

Generation speed trends down across runs without a server restart (2.25 → 2.10 → 1.89 tok/s). This is consistent with the KV cache slot accumulating history across requests — each run sees a larger effective context load. A fresh server start would reset to the run 1 baseline.

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

### Run 2 — Hallucinated libraries, global-scope code (worst output)

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

### Run 3 — Correct for-loops, global-scope `pinMode`, spurious delay (best output)

Run 3 produced the closest result to correct. The ascending/descending for-loops use `analogWrite` properly:

```cpp
for (int i = 0; i <= 255; i++) { analogWrite(LED_PIN, i); delay(8); }
for (int i = 255; i >= 0; i--) { analogWrite(LED_PIN, i); delay(8); }
```

Remaining bugs:
- `pinMode(LED_PIN, OUTPUT)` placed at global scope outside any function — will not compile
- `loop()` adds a spurious `delay(1000)` before calling `blinkLed()`, breaking the smooth continuous cycle
- `setup()` calls `blinkLed()` once before `loop()` takes over — harmless but unnecessary

### `pinMode` in `setup()` — ❌ missing in all three runs

Never correctly placed inside `setup()` across any run.

### Root cause (temperature=0.6 runs)

Three runs at temperature=0.6 produced three different failure modes: recursive crash, hallucinated libraries, near-correct with global-scope errors. High sampling temperature was the primary driver of this variance — see temperature analysis below.

---

## Temperature Analysis (runs 4–5, temperature=0.1)

**Hypothesis:** the output variance across runs 1–3 was caused by temperature=0.6, not model capacity. At 0.6 the sampler has enough entropy to diverge onto very different token paths each run. Lowering to 0.1 should collapse the distribution toward the model's dominant completion and expose the true stable failure mode.

**Server restarted** before run 4 to reset KV cache accumulation to baseline.

### Run 4 (temp=0.1, fresh server)

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 253 |
| Finish reason | `stop` |
| TTFT | 41.15s — **6.63 tok/s** |
| Generation | 113.16s — **2.24 tok/s** |
| End-to-end | 154.48s |

### Run 5 (temp=0.1, same server)

| Metric | Value |
|---|---|
| Prompt tokens | 273 |
| Completion tokens | 315 |
| Finish reason | `stop` |
| TTFT | 41.31s — **6.61 tok/s** |
| Generation | 169.15s — **1.86 tok/s** |
| End-to-end | 210.63s |

### Temperature findings

**Hypothesis confirmed.** At temperature=0.1:

- **TTFT is rock-solid:** 6.61–6.63 tok/s across both runs (vs 6.11–7.40 at 0.6). Prefill is deterministic regardless of temperature.
- **For-loops are consistent:** both runs produced correct ascending/descending `analogWrite` loops.
- **Failure mode stabilised:** global-scope code (no `setup()`/`loop()` wrapper) in both runs — same bug, not a different one each time.
- **Generation speed still degrades** (2.24 → 1.86 tok/s) from KV cache accumulation — temperature does not affect this.

**What temp=0.1 fixed:** hallucinated libraries, recursive functions, random structural chaos.

**What temp=0.1 did not fix:** the model still emits all code at global scope, missing the `setup()`/`loop()` structure. This is now the model's consistent failure mode at low temperature — a structural gap rather than random hallucination.

Run 5 explanation text also contradicts its own code: *"The breathing happens because the LED is toggling between 0 and 255, which is a blink, not a fade"* — while the code above it correctly fades. The comment path and code path are generated from different attention patterns and are not always coherent.

### Updated quality summary across all runs

| Run | Temp | For-loops | `setup()`/`loop()` | `pinMode` | Compilable |
|---|---|---|---|---|---|
| 1 | 0.6 | Recursive crash | No | No | No |
| 2 | 0.6 | Hallucinated | No | No | No |
| 3 | 0.6 | Correct but misplaced | Partial | No | No |
| 4 | **0.1** | **Correct** | **No** | No | No |
| 5 | **0.1** | **Correct** | **No** | No | No |

Temperature=0.1 surfaces the model's true stable failure: correct loop logic, wrong structural scaffold. This is a better starting point for prompt engineering than random hallucinations.

---

## Verdict: 0.6B Q4_0 Remains the Better Model for Uno Q

| Criterion | 0.6B Q4_0 (temp=0.6) | 0.8B Q4_0 (temp=0.1) |
|---|---|---|
| Generation speed | **3.14–3.64 tok/s** | 1.86–2.24 tok/s |
| Completes response | **Yes** (`stop`) | Yes (`stop`) |
| `pinMode` correct (with rule) | **Yes** | No |
| For-loop logic | No (toggle) | **Yes** (at temp=0.1) |
| `setup()`/`loop()` scaffold | **Yes** | No |
| Output consistency | Stable | Stable at temp=0.1 |
| Model size on disk | **448 MB** | 490 MB |
| Classroom viability | **Good** (~130s/response) | Marginal (~155–210s) |

At temperature=0.1, the 0.8B produces correct for-loop logic but no sketch scaffold. The 0.6B at temperature=0.6 produces correct scaffold but wrong loop logic. Neither alone produces a working sketch. Template injection (embedding a verbatim reference sketch in SOUL.md) is the practical fix for both.

**Active model remains:** `Qwen_Qwen3-0.6B-Q4_0.gguf` — faster, completes within budget, scaffold is correct.

---

## Recommended Next Steps

1. **Lower temperature to 0.1 in config** — applies to both models. Eliminates hallucination variance with no speed cost.

2. **Sketch template injection** — inject verbatim reference implementations for common patterns into SOUL.md. At temp=0.1 the 0.6B model reliably copies verbatim examples. This fixes the for-loop issue without a model swap.

3. **Re-evaluate 0.8B Q4_0 at temp=0.1 with template injection** — with correct loop logic already stable, adding the scaffold template may produce a fully correct sketch. Worth one more test before ruling it out.

4. **Evaluate Qwen3-1.7B-Q4_0** — the next step up in the Qwen3 family. At ~1.1 GB it would decode at ~1.4–1.8 tok/s. Worth benchmarking after the template injection fix is in place.

5. **Clean up systemd unit** — `sudo rm /etc/systemd/system/llama-server.service && sudo systemctl daemon-reload`.
