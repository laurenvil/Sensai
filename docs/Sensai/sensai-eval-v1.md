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

**TTFT (16s vs 2.25s):** Cold KV-cache penalty. The v4 baseline was measured with a warm cache immediately after a prior prompt. Raw prompt throughput (5.74 tok/s) is on par with v4 (6.12 tok/s) — the hardware ceiling is intact for prefill.

**Generation speed (1.25 tok/s vs 4.43 tok/s):** The v4 baseline only measured a 10-token response. A single-token warm probe in this session measured 5.94 tok/s — matching v4. The 1.25 tok/s sustained rate over 400 tokens is caused by Q6_K dequantization compute on the armv8.0 backend; see the deep-dive section below.

**Swap (143 MB):** Present during earlier competing-server attempts but not during the clean benchmark (VmSwap: 0 confirmed on the server process). The AI Town `llama-server.service` (embedding server) was causing OOM-level slowdowns (1.14 tok/s) via `SO_REUSEPORT` load balancing before it was disabled.

---

## Generation Speed Deep Dive

### Does `--parallel 2` cause the slowdown?

Not directly. `--parallel 2` allocates KV cache for two simultaneous request slots upfront (288 MB total vs 144 MB for `--parallel 1`). But during single-user generation, only the active sequence's KV entries are read — at token 492, that is:

```
KV cache per token = n_layers × 2 (K+V) × n_kv_heads × head_dim × 2 bytes (fp16)
                   = 24 × 2 × 2 × 64 × 2 = 12,288 bytes = 12 KB/token
KV at 492 tokens   = 492 × 12 KB = 5.8 MB
```

Parallel=2 does not double the active KV reads per token. It only doubles the static allocation, adding 144 MB of extra DRAM pressure — a minor effect, not the cause of 1.25 tok/s.

### The real bottleneck: Q6_K dequantization on `libggml-cpu-armv8.0_1.so`

Bandwidth math per generated token:

| Component | Size |
|---|---|
| Model weights (Q6_K, must be read and dequantized) | 655 MB |
| KV cache at token 492 | 5.8 MB |
| **Total bytes read per token** | **~661 MB** |

**Measured:** 1.25 tok/s → 0.8s per token → effective throughput = **826 MB/s (0.81 GB/s)**
**LPDDR4X theoretical peak:** 3,500 MB/s (3.5 GB/s)
**Utilisation: 23.6%**

At 23.6% LPDDR4X utilisation, the bottleneck is not memory bandwidth — it is **CPU compute**. The loaded backend is `libggml-cpu-armv8.0_1.so`, the baseline ARMv8.0 path. The Cortex-A53 is an **in-order** processor: its 2-wide NEON pipeline cannot reorder or speculate around slow dequantization operations. Q6_K stores weights in a complex bit-packed format that requires multiple NEON shuffle-and-mask operations per block to dequantize. On an out-of-order A72/A78 this overhead is hidden; on the A53 it serialises.

This also explains why the 10-token probe measured 5.94 tok/s: after prompt evaluation the model weights for the first few layers are still warm in the CPU's L2 cache (512 KB per core). The first ~10 tokens benefit from cache-warm dequantization. As generation continues past ~50 tokens, the working set outgrows L2 and every token requires a full 655 MB pass over cold DRAM — at 826 MB/s effective throughput.

**CPU state during benchmark (confirmed):**
- All 4 cores at 2016 MHz (no thermal throttling; package temp 40–45°C)
- VmSwap: 0 (no swapping; model fully resident in RAM)
- 10 OS threads spawned; `--threads` defaulted to hardware_concurrency (4)
- CPU% during long generation: ~95% (1 core fully loaded — NEON pipeline serialised)

### Optimisation Ranking

| Priority | Change | Expected sustained tok/s | Notes |
|---|---|---|---|
| **1** | Switch to `Qwen3-0.6B-Q4_0.gguf` | **3.5–6 tok/s** | 340 MB model, ~2× less to read, Q4_0 dequant is ~2–2.5× faster on A53 NEON. Whitepaper ceiling: ~10 tok/s. |
| **2** | Add `--mlock` to launch script | +0–0.5 tok/s | Prevents any page eviction under memory pressure; already used in `llama-cli` examples |
| **3** | Add `-t 4` explicitly | +0–0.3 tok/s | Default `-1` already selects 4 cores; explicit flag ensures it under all conditions |
| **4** | Add `--cache-type-k q8_0 --cache-type-v q8_0` | +0.1–0.3 tok/s | Halves KV cache bandwidth (5.8 MB → 2.9 MB at 492 tokens); marginal at this scale |
| **5** | Set `--parallel 1` for single-user | +0–0.2 tok/s | Saves 144 MB KV allocation; use `--parallel 2` for classroom |
| **6** | Adreno 702 OpenCL prefill build | TTFT only (5–13×) | Requires rebuilding llama.cpp with OpenCL; decode speed unchanged |

### Q4_0 vs Q6_K — Why Q4_0 Wins on A53

| Aspect | Q6_K | Q4_0 |
|---|---|---|
| Model size | 655 MB | ~340 MB |
| Bytes read per token | 661 MB | ~346 MB |
| Dequant cost (A53 NEON) | High — complex bit shuffle per block | Low — 4-bit nibble unpack, 2–3× fewer NEON ops |
| Expected sustained tok/s | 1.25 tok/s (measured) | 3.5–6 tok/s (projected) |
| Quality impact | Better (higher quantisation fidelity) | Minor degradation on short coding tasks |

For Sensai's use case — short Arduino sketches and explanations — Q4_0 quality is sufficient. The whitepaper (architecture-study-bible.md) documents Q4_0 as the "bandwidth-optimal model with ~10 tok/s decode ceiling."

### Recommended llama-server Flags (Updated)

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen3-0.6B-Q4_0.gguf \   # switch from Q6_K to Q4_0
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 \
  --parallel 2 \                         # keep 2 for classroom; use 1 for single-user
  -t 4 \                                 # explicit: all 4 Cortex-A53 cores
  --mlock \                              # lock weights in RAM
  --cache-type-k q8_0 \                 # halve KV cache bandwidth
  --cache-type-v q8_0
```

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

**Performance (highest impact first):**
1. **Download Qwen3-0.6B-Q4_0** — primary action for generation speed. Projected 3.5–6 tok/s sustained; whitepaper ceiling ~10 tok/s. Run: `wget -O ~/models/Qwen3-0.6B-Q4_0.gguf 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf'`
2. **Update `sensai-launch.sh`** — add `-t 4`, `--mlock`, `--cache-type-k q8_0`, `--cache-type-v q8_0`, and switch model path to Q4_0.
3. **Re-run benchmark with Q4_0** — measure sustained tok/s over 400 tokens to validate projection.

**Response quality:**
4. **Tune SOUL.md** — add explicit Arduino pattern rules: PWM breathing = `analogWrite` for-loop; always emit `pinMode` in `setup()`.
5. **Raise `max_tokens`** to 600–800 — 400 tokens truncates sketch + explanation mid-way.

**Housekeeping:**
6. **Update systemd unit** — `/etc/systemd/system/llama-server.service` still references the old AI Town embedding config. Update to Sensai flags or remove the unit file entirely (`sudo rm /etc/systemd/system/llama-server.service`).
