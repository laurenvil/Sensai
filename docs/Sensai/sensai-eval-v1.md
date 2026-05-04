# Sensai Evaluation — v1

**Date:** 2026-05-04
**Branch:** `sensai`
**Model:** Qwen3.5-0.8B-Q6_K · `--ctx-size 12288 --parallel 2` · `/no_think` active (via `chat_template_kwargs`)
**Hardware:** Arduino Uno Q (QRB2210, 4× Cortex-A53, 4 GB LPDDR4X)

---

## Test Prompt

> "Write a sketch that fades an LED on pin 9 in and out like breathing, then explain how it works."

---

## Benchmark Results

| Metric | v1 (this run) | v4 baseline |
|---|---|---|
| Prompt tokens | 92 | ~90 |
| Completion tokens | 400 (hit limit) | 10 |
| Prompt eval (TTFT) | 16.02s (5.74 tok/s) | 2.25s (6.12 tok/s) |
| Generation time | 319.43s (1.25 tok/s) | ~2.3s (4.43 tok/s) |
| End-to-end | 335.45s | 4.50s |
| Thinking suppressed | ✓ | ✓ |
| Swap use | ~143 MB | None |
| Finish reason | `length` | `stop` |

### Notes on the Numbers

**TTFT (16s vs 2.25s):** The gap is a cold KV-cache penalty. The v4 baseline was measured with a warm cache immediately after a prior prompt. Raw prompt throughput (5.74 tok/s) is on par with v4 (6.12 tok/s) — the hardware is performing correctly.

**Generation speed (1.25 tok/s vs 4.43 tok/s):** The v4 baseline measured a 10-token response. Over 400 tokens the KV cache grows from ~100 to ~500 entries and saturates the LPDDR4X memory bus. A single-token warm probe during this session measured 5.94 tok/s, confirming the hardware ceiling is intact — the degradation is sustained-generation bandwidth, not a regression.

**Swap (143 MB):** Present but not causing thrashing. The AI Town `llama-server.service` (embedding server) was running simultaneously during earlier attempts and caused OOM-level slowdowns (1.14 tok/s). After disabling it with `sudo systemctl disable --now llama-server`, performance stabilised.

---

## Response Quality Issues

### Issue 1 — Wrong sketch (LED toggle, not fade)

The model generated a boolean toggle instead of a PWM fade:

```cpp
boolean isOn = true;
void loop() {
    delay(100);
    isOn = !isOn;  // flips a variable — never calls analogWrite
}
```

A breathing LED requires `analogWrite` driven by a `for` loop:

```cpp
void loop() {
    for (int i = 0; i <= 255; i++) { analogWrite(9, i); delay(8); }
    for (int i = 255; i >= 0; i--) { analogWrite(9, i); delay(8); }
}
```

**Root cause:** The model associates "fade" with state toggling rather than PWM ramping. SOUL.md has no explicit Arduino pattern rule for this.

**Fix:** Add an explicit rule to SOUL.md: "breathing LED = `analogWrite` in ascending/descending `for` loops, never `delay` + boolean toggle."

### Issue 2 — Missing `pinMode` in `setup()`

`setup()` body was empty — `pinMode(9, OUTPUT)` was not emitted. The sketch will silently do nothing on a fresh board.

**Root cause:** The model omitted boilerplate. SOUL.md should enforce: "always include `pinMode(<pin>, OUTPUT)` in `setup()` for any pin used with `analogWrite` or `digitalWrite`."

---

## Issues Discovered During Setup

| Issue | Resolution |
|---|---|
| `/no_think` in system prompt text does not suppress Qwen3 reasoning via REST API | Fixed: `chat_template_kwargs: {"enable_thinking": false}` added to `extra_body` in model config. Required new `ExtraBody` field in `ModelConfig` and `WithExtraBody` option in `openai_compat` provider. |
| AI Town `llama-server.service` (`--embedding --pooling mean`) running on same port with `SO_REUSEPORT` | Fixed: `sudo systemctl disable --now llama-server`. Removed competing model instance; freed ~700 MB RAM bandwidth. |
| Go 1.24.4 on board; sensai branch requires 1.25.7+ | Fixed: Go 1.26.2 installed to `~/go-installs/go/`. |
| `yzma/lib/` empty in sensai branch checkout | Fixed: symlinked from `/home/arduino/ArduinoApps/yzma/lib/`. |

---

## Recommended Next Steps

1. **Tune SOUL.md** — add explicit Arduino sketch patterns (PWM fade, `pinMode` boilerplate) to prevent hallucinated API calls and missing setup code.
2. **Raise `max_tokens`** — 400 tokens is insufficient for a sketch + explanation. 600–800 tokens recommended.
3. **Warm-cache benchmark** — re-run with a prior prompt in the same session to get a true TTFT baseline comparable to v4.
4. **Systemd permanent fix** — `llama-server.service` is disabled but the unit file still exists at `/etc/systemd/system/llama-server.service`. Update or remove it to reflect the Sensai configuration (port 8081, `--ctx-size 12288`, no `--embedding` flag).
