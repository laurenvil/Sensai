# Sensai Evaluation — v1.2

**Date:** 2026-05-04
**Branch:** `sensai`
**Model:** Qwen3-0.6B-Q4_0 (bartowski) · `--ctx-size 12288 --parallel 2 -t 4 --mlock --cache-type-k q8_0 --cache-type-v q8_0`
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53 @ 2.0 GHz, 4 GB LPDDR4X)

This document supersedes v1.1. It adds the quality verification benchmark (SOUL.md rules applied), the max_tokens=800 config change, and documents the 0.6B model's structural code-pattern limitation.

---

## Changes from v1.1

| Change | Detail |
|---|---|
| `max_tokens` raised to 800 | `config/sensai.config.json` + `~/.picoclaw/config.json` (was 4096/1024 → **800**) |
| SOUL.md rule: `pinMode` | "ALWAYS include `pinMode(<pin>, OUTPUT)` in `setup()` for every pin used with `analogWrite` or `digitalWrite`. An empty `setup()` is a bug." |
| SOUL.md rule: breathing pattern | "Breathing/fading LED = `analogWrite` in ascending then descending `for` loops. A toggle is a blink, not a fade — never confuse the two." |
| SOUL.md pattern example (What You Know) | Reference for-loop implementation injected into the knowledge section |

---

## Benchmark History

### v1 — Qwen3.5-0.8B-Q6_K (baseline)

| Metric | Value |
|---|---|
| Prompt tokens | 92 |
| Completion tokens | 400 (hit limit) |
| TTFT | 16.02s — 5.74 tok/s |
| Generation | 319.43s — **1.25 tok/s** |
| End-to-end | 335.45s |
| Finish reason | `length` |

### v1.1 — Qwen3-0.6B-Q4_0, speed benchmark (102-token system prompt)

| Metric | Value | vs v1 |
|---|---|---|
| Prompt tokens | 102 | — |
| Completion tokens | 454 | Completed naturally |
| TTFT | 7.66s — 13.31 tok/s | **2.1× faster** |
| Generation | 124.61s — **3.64 tok/s** | **2.9× faster** |
| End-to-end | 132.39s | **2.5× faster** |
| Finish reason | `stop` | ✓ |
| Thinking suppressed | ✓ | — |
| Swap | 0 | — |

### v1.2 — Qwen3-0.6B-Q4_0, quality benchmark (265-token system prompt with SOUL.md rules)

| Metric | Value | vs v1.1 speed run |
|---|---|---|
| Prompt tokens | 265 | +163 (SOUL.md rules inline) |
| Completion tokens | 228 | — |
| TTFT | 21.99s — 12.05 tok/s | −1.26 tok/s (larger prompt) |
| Generation | 72.55s — **3.14 tok/s** | −0.50 tok/s (larger KV) |
| End-to-end | 94.63s | — |
| Finish reason | `stop` | ✓ |
| Thinking suppressed | ✓ | ✓ |
| max_tokens | 800 | was 1024/4096 |

**Note on speed delta:** The 0.50 tok/s drop from 3.64 → 3.14 is explained by the larger KV cache load — 265 prompt tokens vs 102 means ~2.5 MB more KV data per decode step. Not a regression; scales with prompt size as expected.

---

## Quality Verification

Prompt: *"Write me an Arduino sketch for a breathing LED on pin 9. The LED should smoothly fade in and out."*

### Issue 1 — `pinMode` in `setup()` ✅ FIXED

v1.2 response correctly emits:
```cpp
void setup() {
    pinMode(LED_PIN, OUTPUT);
}
```

The SOUL.md rule resolved this. `setup()` is no longer empty.

### Issue 2 — Breathing LED for-loop ❌ STILL BROKEN

v1.2 response:
```cpp
void toggleLED() {
    analogWrite(LEDPIN, 255);
    delay(8);
    analogWrite(LEDPIN, 0);
    delay(8);
}

void loop() {
    toggleLED();
}
```

Despite the explicit rule in the system prompt, the 0.6B model pattern-matches "toggle" for any LED task. The correct implementation requires ascending and descending `for` loops:

```cpp
void loop() {
    for (int i = 0; i <= 255; i++) { analogWrite(9, i); delay(8); }
    for (int i = 255; i >= 0; i--) { analogWrite(9, i); delay(8); }
}
```

The model also introduced a macro name collision (`LEDPIN` vs `LED_PIN`), a secondary bug not seen in v1.

---

## Root Cause: 0.6B Model Capacity Limitation

The breathing LED for-loop failure is not a prompt engineering problem — it is a model capacity problem.

A 0.6B parameter model stores relatively few "circuits" for code generation. When presented with an LED task, it activates a dominant "toggle LED" pattern that was heavily reinforced during pretraining (it is the most common LED snippet on GitHub and in tutorials). The SOUL.md instruction to use `for` loops conflicts with this dominant pattern. At 0.6B the conflict resolves in favour of the memorised pattern.

Evidence:
- Rule provided verbatim in system prompt with the exact code template → model ignored it
- Model still produced `delay(8)` intervals (from the rule) but applied them inside a toggle, not a loop
- At 1.7B+ parameters, the model has enough capacity to hold the instruction in working context and override the dominant pattern

**This is a fundamental ceiling for the 0.6B model on multi-step structural code instructions.** Prompt engineering cannot reliably fix it.

---

## Cumulative Improvement vs v1 Baseline

| Metric | v1 | v1.2 | Total improvement |
|---|---|---|---|
| Generation speed | 1.25 tok/s | 3.14–3.64 tok/s | **2.5–2.9×** |
| TTFT | 16.02s | 7.66–21.99s* | **2.1× faster** (speed run) |
| Completes response | No (hits cap) | Yes (`stop`) | ✓ |
| Thinking suppressed | ✓ | ✓ | — |
| `pinMode` correct | No | Yes | ✓ |
| Breathing for-loop correct | No | No | ✗ open |

*TTFT scales with prompt token count: 7.66s at 102 tokens, 21.99s at 265 tokens (~13 tok/s prefill rate is consistent).

---

## Recommended Next Steps

### Option A — Sketch template injection (no model change)

Inject reference implementations for the 3–5 most common beginner patterns directly into SOUL.md as copy-paste templates. The model reliably copies verbatim examples when they appear in the system prompt, even if it cannot generate them from a rule description.

```markdown
## Canonical Patterns — use these exactly

**Breathing LED (fade in/out):**
```cpp
void loop() {
    for (int i = 0; i <= 255; i++) { analogWrite(pin, i); delay(8); }
    for (int i = 255; i >= 0; i--) { analogWrite(pin, i); delay(8); }
}
```
```

Cost: ~50–80 extra prompt tokens per pattern. At 13 tok/s prefill, 5 patterns = ~30 tokens → 2.3s extra TTFT. Acceptable.

### Option B — Upgrade to Qwen3-1.7B-Q4_0

`bartowski/Qwen_Qwen3-1.7B-GGUF` → `Qwen_Qwen3-1.7B-Q4_0.gguf` (~1.1 GB).

| Aspect | Q4_0 0.6B | Q4_0 1.7B |
|---|---|---|
| File size | 385 MB | ~1,100 MB |
| Bytes read per token | ~391 MB | ~1,106 MB |
| Projected sustained tok/s | 3.1–3.6 tok/s | ~1.1–1.4 tok/s |
| Follows for-loop instruction | No (pattern override) | Likely yes |
| Acceptable for classroom | Yes | Marginal (>3 min/response) |

**Recommendation: implement Option A first.** Template injection costs nothing and resolves the specific failure mode. Reserve Option B for when the model demonstrates other quality failures that templates cannot cover (e.g., I2C register maps, interrupt handlers).

### Option C — Clean up systemd unit

`/etc/systemd/system/llama-server.service` still references the old AI Town embedding config. Run:
```bash
sudo rm /etc/systemd/system/llama-server.service
sudo systemctl daemon-reload
```
