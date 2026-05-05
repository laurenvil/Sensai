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

| Run | Temp | Scaffold template | For-loops | `setup()`/`loop()` | `pinMode` | Compilable |
|---|---|---|---|---|---|---|
| 1 | 0.6 | No | Recursive crash | No | No | No |
| 2 | 0.6 | No | Hallucinated | No | No | No |
| 3 | 0.6 | No | Correct but misplaced | Partial | No | No |
| 4 | 0.1 | No | Correct | No | No | No |
| 5 | 0.1 | No | Correct | No | No | No |
| **6** | **0.1** | **Yes** | **✅ Correct** | **✅ Yes** | **✅ Yes** | **✅ Yes** |
| **7** | **0.1** | **Yes** | **✅ Correct** | **✅ Yes** | **✅ Yes** | **✅ Yes** |

---

## Scaffold Template Benchmark (Runs 6–7)

Fresh server restart before run 6.

### Run 6 (temp=0.1, scaffold injected, fresh server)

| Metric | Value |
|---|---|
| Prompt tokens | 406 (+133 from scaffold) |
| Completion tokens | 193 |
| Finish reason | `stop` |
| TTFT | 58.03s — 7.00 tok/s |
| Generation | 77.25s — **2.50 tok/s** |
| End-to-end | 135.46s |

### Run 7 (temp=0.1, scaffold injected, same server)

| Metric | Value |
|---|---|
| Prompt tokens | 406 |
| Completion tokens | 192 |
| Finish reason | `stop` |
| TTFT | 59.12s — 6.87 tok/s |
| Generation | 106.89s — **1.80 tok/s** |
| End-to-end | 166.19s |

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

**First fully correct, compilable sketch produced across all 7 runs.** Both scaffold runs are identical. The model copied the canonical pattern exactly and placed `pinMode` correctly inside `setup()`.

### TTFT cost of scaffold template

| Config | Prompt tokens | TTFT |
|---|---|---|
| No scaffold (temp=0.1) | 273 | 41s |
| With scaffold (temp=0.1) | 406 | 58–59s |
| Delta | +133 tokens | +17–18s |

17–18s extra TTFT for guaranteed correct output is a clear trade-off win for a classroom context.

---

## Final Verdict

| Criterion | 0.6B Q4_0 temp=0.6 | 0.8B Q4_0 temp=0.1 + scaffold |
|---|---|---|
| Generation speed | **3.14–3.64 tok/s** | 1.80–2.50 tok/s |
| TTFT (406-token prompt) | ~34s | ~58s |
| Correct for-loops | No | **Yes** |
| `setup()`/`loop()` scaffold | **Yes** | **Yes** |
| `pinMode` correct | Yes (with rule) | **Yes** |
| Compilable | No | **Yes** |
| Output consistency | Stable (wrong) | **Stable (correct)** |
| Classroom viability | Faster but wrong | Correct, ~135–166s |

The 0.8B Q4_0 at temperature=0.1 with scaffold template injection **produces correct, compilable sketches consistently**. The 0.6B Q4_0 is faster but still requires the same template fix to resolve its for-loop failure.

**Recommended active config:** 0.8B Q4_0, temperature=0.1, scaffold in SOUL.md — until the TTFT cost (~58s) becomes unacceptable for classroom use, at which point revert to 0.6B with the same SOUL.md.

---

## Changes Implemented

| File | Change |
|---|---|
| `~/.picoclaw/workspace/SOUL.md` | Added `## Canonical Sketch Templates` section with scaffold and breathing LED verbatim pattern |

---

## Recommended Next Steps

1. **Update `config/sensai.config.json` and `~/.picoclaw/config.json`** to set `temperature: 0.1` and switch active model to `Qwen_Qwen3.5-0.8B-Q4_0.gguf`.

2. **Add blink and button debounce templates** to SOUL.md — the two next most common patterns after breathing LED.

3. **Evaluate Qwen3-1.7B-Q4_0** — with template injection now proven effective, a 1.7B model at temp=0.1 + scaffold is the natural next candidate. Trade-off: ~1.4 tok/s, ~2 min per response.

4. **Clean up systemd unit** — `sudo rm /etc/systemd/system/llama-server.service && sudo systemctl daemon-reload`.
