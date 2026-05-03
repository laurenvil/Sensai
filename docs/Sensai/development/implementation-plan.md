# Sensai Implementation Plan

## Goal

Transform the picoclaw agent framework into **Sensai**: a domain-specific Arduino coding assistant that runs entirely on-device on the Arduino Uno Q, accessible via Telegram from anywhere on the local network (or internet, with port forwarding).

The product target is a maker education tool: a student sends a question via Telegram, the Uno Q processes it locally using Qwen3.5-0.8B-Q6_K via llama-server, and returns an Arduino-specific answer in under 10 seconds — no cloud, no API key, no data leaving the room.

---

## What Was Implemented (Branch: `sensai`)

### 1. Sensai System Prompt — `workspace/SOUL.md`

**File:** `workspace/SOUL.md`

The most impactful single change. The upstream default is a generic "helpful AI assistant" prompt with no hardware context. Sensai's SOUL.md:

- Prepends `/no_think` — suppresses Qwen3's chain-of-thought reasoning tokens. Without this, the model generates hundreds of thinking tokens before every response, adding 30–120s of latency on constrained hardware.
- Declares the assistant as "Sensai" with explicit Arduino Uno Q GPIO pinout (digital, PWM, analog, I2C, SPI, UART) so the model never has to guess.
- Enforces a 250-word response cap. The model generates at ~4 tok/s on Uno Q; a 250-word cap bounds worst-case response time to ~75 seconds (typical responses are 80–150 words, ~30s).
- Instructs the model to produce complete, runnable sketches in ```cpp blocks.
- Defines common beginner patterns and mistakes the model should know without tool calls.
- Keeps tone appropriate for 10–16 year old students.

**Why SOUL.md over code changes:** SOUL.md is loaded via `LoadBootstrapFiles()` in `pkg/agent/context.go` and cached on first request. Changing it requires no recompile and takes effect on the next agent restart. It is the highest-leverage configuration point for a 0.8B model operating in a narrow domain.

### 2. Sensai Identity — `workspace/IDENTITY.md`

**File:** `workspace/IDENTITY.md`

Rewritten to declare "Sensai" as the name and describe its on-device, student-centered purpose. This is loaded alongside SOUL.md into the system prompt. Removes all references to picoclaw, cloud providers, and generic capability lists.

### 3. Hardware-Tuned Config — `config/sensai.config.json`

**File:** `config/sensai.config.json`

Derived from `config/config.example.json` with the following changes:

| Parameter | Default | Sensai | Reason |
|---|---|---|---|
| `model_name` | `gpt-5.4` | `qwen-local` | Local llama-server |
| `api_base` | OpenAI | `http://127.0.0.1:8080/v1` | yzma/llama-server |
| `request_timeout` | 30s | 1200s | Slow hardware; 0.8B @ 4 tok/s |
| `max_tokens` | 8192 | 4096 | Bounds generation time |
| `max_tool_iterations` | 20 | 8 | Reduces round-trips to llama-server |
| `summarize_message_threshold` | 20 | 10 | Lower for memory-constrained device |
| `summarize_token_percent` | 75% | 70% | Slightly more aggressive compression |
| Web tools | enabled | **disabled** | No internet; eliminates DuckDuckGo DNS lookups that add 200–800ms |
| Skills/find/install | enabled | **disabled** | Reduces tool context in system prompt |
| Spawn/subagent | enabled | **disabled** | Not needed; saves memory |
| MCP | disabled | disabled | No Node.js runtime on Uno Q |
| I2C tool | disabled | **enabled** | Hardware access for sensor reads |
| SPI tool | disabled | **enabled** | Hardware access |
| Heartbeat | enabled | **disabled** | Eliminates background LLM calls |
| `devices.enabled` | false | **true** | USB device monitoring |
| Telegram placeholder | "Thinking... 💭" | "Asking Sensai..." | Branded UX feedback |

### 4. Makefile Target — `make sensai-setup`

**File:** `Makefile`

New target that:
1. Creates `~/.picoclaw/workspace/` if absent
2. Installs `workspace/SOUL.md` and `workspace/IDENTITY.md` to the workspace
3. Installs `config/sensai.config.json` to `~/.picoclaw/config.json` (skips if already exists)
4. Prints the llama-server start command and next steps

Usage:
```bash
make sensai-setup
# then set TELEGRAM_BOT_TOKEN in ~/.picoclaw/config.json
make build
./build/picoclaw agent
```

---

## Latency Budget (Telegram → Response)

```
User sends Telegram message
  ↓
Telegram long-poll (max 30s, typically <1s for delivery)
  ↓ ~0.1s
picoclaw receives on bus, builds system prompt (cached after first request)
  ↓ ~0.05s
OpenAI-compat provider sends request to llama-server at 127.0.0.1:8080
  ↓ 2.2s TTFT (v4 benchmark, Qwen3.5-0.8B Q6_K, ctx=12288)
llama-server generates response @ ~4.4 tok/s
  → 80-word response ≈ 110 tokens ≈ 25s total
  → 150-word response ≈ 220 tokens ≈ 50s total
  ↓
picoclaw publishes to Telegram outbound bus
  ↓ ~0.2s
User receives response
```

**Effective end-to-end: 3–30 seconds** for typical Arduino Q&A responses.

The 250-word cap in SOUL.md is the primary lever for bounding this. Reducing `max_tokens` to 512 would cut worst-case to ~8s but risks truncation on sketch responses; 4096 gives headroom.

### Placeholder Message

The Telegram channel sends "Asking Sensai..." immediately on receipt (before the LLM call begins). This makes the interaction feel responsive even when generation takes 20+ seconds, because the student sees feedback within 1 second of sending.

---

## What Was NOT Changed (Intentionally)

### No Go source modifications

The picoclaw agent loop, channel adapters, provider layer, and tool registry were not modified. All Sensai-specific behavior is driven by configuration and workspace files, which:

- Require no recompile when changed
- Survive upstream merges to Go source files
- Are easier for non-Go contributors to modify

### No new tools

The I2C and SPI tools already exist in `pkg/tools/i2c.go` and `pkg/tools/spi.go` — they just needed to be enabled in config. The exec tool covers Arduino CLI invocation.

### Upstream sync strategy

Upstream picoclaw (`github.com/sipeed/picoclaw`) has 1949 commits ahead of the fork point. A full merge would conflict with our README and SOUL.md customizations. The recommended sync strategy:

1. `git fetch upstream`
2. Cherry-pick bug-fix commits from `pkg/providers/openai_compat/` and `pkg/agent/` that are relevant to our inference path
3. Avoid merging `README.md`, `workspace/`, or `config/` changes from upstream — these are Sensai-specific

Key upstream commits to monitor:
- Bug fixes in `pkg/providers/openai_compat/provider.go` (our inference path)
- Bug fixes in `pkg/agent/loop.go` (message processing)
- Any changes to `pkg/tools/i2c.go` or `pkg/tools/spi.go`

---

## Future Work

### Phase 2: Streaming responses to Telegram

Currently, picoclaw waits for the complete LLM response before sending. Implementing streaming would let Telegram show tokens as they arrive, making 30-second responses feel like 3 seconds. The openai-compat provider would need to handle SSE, and the Telegram channel would need to use `editMessageText` on an existing placeholder.

Complexity: Medium (provider + channel changes). High impact for UX.

### Phase 3: Arduino CLI tool ✅ Implemented

Built-in tool (`pkg/tools/arduino.go`) that:
1. Writes a sketch to a temp `.ino` file in the correct `<dir>/<dir>.ino` structure
2. Runs `arduino-cli compile --fqbn <board>` and returns error output to the LLM
3. Runs `arduino-cli upload` when requested, with configurable port and protocol
4. Detects connected boards via `arduino-cli board list`

Configured in `config/sensai.config.json` with FQBN defaulting to `arduino:zephyr:unoq`. SOUL.md instructs the model when and how to use the tool. Requires `arduino-cli` and the `arduino:zephyr` core installed on the Uno Q.

### Phase 4: Ventuno Q NPU path

When the Ventuno Q (IQ-8275, 40 TOPS Hexagon NPU) becomes available, the inference backend path changes. The yzma FFI layer would need to target the Hexagon runtime instead of llama.cpp's ARM CPU path. Expected: sub-1s TTFT, 50+ tok/s decode, enabling 3B–7B models at practical speeds.

### Phase 5: Classroom multi-user

For classroom deployments: run llama-server with `--parallel 4`, expose the picoclaw gateway on the local network, and configure `allow_from` in Telegram config to a list of student Telegram IDs. Each student gets their own session key; conversations are isolated. No additional code changes needed.
