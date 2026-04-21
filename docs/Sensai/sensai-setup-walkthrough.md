# Sensai Setup Walkthrough

```
███████╗███████╗███╗   ██╗███████╗ █████╗ ██╗
██╔════╝██╔════╝████╗  ██║██╔════╝██╔══██╗██║
███████╗█████╗  ██╔██╗ ██║███████╗███████║██║
╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══██║██║
███████║███████╗██║ ╚████║███████║██║  ██║██║
╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝
```

Step-by-step guide to run Sensai on an Arduino Uno Q — from a fresh board to a working AI assistant that writes, compiles, and uploads Arduino sketches.

v3 ships **two execution paths**:
- **Agentic** (`make sensai-agentic` / `make sensai`) — full agent loop + 4 tools (read/write/list/arduino); can compile and flash sketches end-to-end.
- **Direct** (`make sensai-direct`) — pre-router + single LLM call, no tools; faster Q&A but cannot compile or upload.

Both paths share the same install, workspace, and skills tree. You pick the path when you launch (Step 5). See `docs/Sensai/eval/v3/sensai-v3-whitepaper.md` for the design rationale.

---

## Prerequisites

| Item | Details |
|---|---|
| Board | Arduino Uno Q (QRB2210, 4 GB RAM, Debian Linux) |
| Go 1.25.7+ | For building the Sensai binary (v3 toolchain requirement) |
| Python 3.10+ | For the direct-path REPL (uses stdlib only — no pip install) |
| Git | To clone the repo |
| curl or wget | For downloading the model and arduino-cli |
| OpenOCD | Pre-installed at `/opt/openocd/` on stock Uno Q images — used by the agentic path to flash sketches |
| Telegram bot token | Optional — from @BotFather on Telegram (agentic path only) |

---

## Step 1: Clone and Initialize

```bash
git clone https://github.com/laurenvil/Sensai.git ~/ArduinoApps/Sensai
cd ~/ArduinoApps/Sensai
git checkout sensai
git submodule update --init --recursive
```

---

## Step 2: Download the Inference Engine

```bash
cd yzma && make download-llama.cpp && cd ..
```

This places `llama-server` in `yzma/lib/`. It is the engine that runs the AI model.

---

## Step 3: Download the AI Model

v3 uses the **Q4_0** quantization as the primary model (~490 MB, faster prefill than Q6_K, equivalent quality on Sensai prompts per v3 eval).

```bash
mkdir -p ~/models
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf'
```

Download once — it does not change.

**Alternative (lower RAM, ~10 tok/s decode ceiling):**

```bash
wget -O ~/models/Qwen_Qwen3-0.6B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf'
```

**0.6B caveat:** Agentic Phase E established that the 0.6B's cold prefill of the pre-router-expanded ~20K-char system prompt exceeds the default `request_timeout: 1200` (seconds). If you use 0.6B, raise `request_timeout` to `2400` in `~/.picoclaw/config.json` or pre-warm the server with a dummy request before the first real prompt.

---

## Step 4: Install Everything

```bash
make sensai-install
```

This single command:
1. Builds the Sensai binary (`build/picoclaw`)
2. Installs the system prompt (`SOUL.md`), identity files, and the **15-skill tree** (`sketch-patterns/`, `led-matrix/`, `uno-q-hardware/`, `bridge/`, `wireless/`, `vision/`, `audio/`, `arduino-app-lab/`, `modulino/`, `linux-led/`, plus general skills) to `~/.picoclaw/workspace/`
3. Copies `config/sensai.config.json` to `~/.picoclaw/config.json` (first run only). The v3 config exposes **8 narrow tools**: `read_file`, `write_file`, `list_dir`, `arduino` (compile/flash), `camera` (V4L2 still capture), `sysfs_led` (MPU-side RGB LEDs), `network` (read-only IP/gateway/interfaces), `i2cdetect` (Linux I²C bus scan). General `exec`, `message`, `edit_file`, generic `i2c`/`spi` remain disabled — every new tool is narrowly scoped and validates inputs against allow-lists. Total schema overhead: ~3,400 chars.
4. Downloads and installs `arduino-cli` to `~/.local/bin/` if not present
5. Installs the `arduino:zephyr` board core for the Uno Q
6. Runs the interactive setup wizard:
   - Confirms model and inference engine are present
   - Confirms `arduino-cli` and board core status
   - Asks for an optional Telegram bot token (agentic path only)
   - Asks who can message the bot (leave blank for anyone on your network)

To re-run just the arduino-cli step later:

```bash
make sensai-arduino-setup
```

To re-run just the onboarding wizard (to change the Telegram token, for example):

```bash
make sensai-onboard
```

To reinstall the system prompt and skills tree after a `git pull`:

```bash
make sensai-setup
```

---

## Step 5: Launch — Pick a Path

Both paths start the same `llama-server` instance under the hood. Pick the path that matches your lesson goal.

### Path A — Agentic (default, production)

```bash
make sensai-agentic    # or simply: make sensai
```

Starts llama-server, the Telegram gateway (if configured), and the agent terminal. The agent loop drives multi-step workflows across **8 tools**:

| Tool | What students can ask Sensai to do |
|---|---|
| `arduino` | "Compile and upload this blink sketch" — flashes STM32U585 at `0x8100000` via OpenOCD |
| `camera` | "Take a picture and save it to /tmp" — V4L2 single-frame capture via GStreamer |
| `sysfs_led` | "Make the red Linux LED blink" — drives `/sys/class/leds/*/brightness` |
| `network` | "What's my board's IP for SSH?" — reads `/proc/net/route`, lists interfaces |
| `i2cdetect` | "Which I²C devices are on bus 0?" — scans `/dev/i2c-*` (read-only) |
| `read_file`, `write_file`, `list_dir` | Workspace navigation for multi-file projects |

The arduino tool invokes `arduino-cli compile --fqbn arduino:zephyr:unoq` then flashes the resulting `.elf-zsk.bin` via OpenOCD at sketch partition address `0x8100000`.

```
  ┌───────────────────────────────────────────┐
  │  🧘  S  E  N  S  A  I                    │
  │      Arduino AI Assistant                  │
  │                                            │
  │  Type your question at 'You:' and press    │
  │  Enter. Sensai responds in a few seconds.  │
  │  Type 'exit' or Ctrl+C to quit.           │
  └───────────────────────────────────────────┘

You: Use the arduino tool to upload a blink sketch for D9 to the board.

Sensai: [calls arduino tool → compiles → flashes → confirms]
```

### Path B — Direct (fast Q&A)

```bash
make sensai-direct
```

Starts llama-server and drops into a Python REPL that POSTs directly to the OpenAI-compatible endpoint, applying the same **23 pre-router rules** as the agent (covering 15 skills). No agent loop. No tools. Lower latency. Cannot compile, upload, capture from the camera, drive LEDs, or scan I²C — sketches are returned as text for you to copy.

```
  ┌───────────────────────────────────────────────┐
  │  🧘  S E N S A I — Direct Server               │
  │      Arduino Q&A Assistant (fast path)         │
  │                                                │
  │  Pre-router + direct API · no tools · no loop  │
  │  Best for: pinouts, voltage, concepts,         │
  │            short sketches you'll flash by hand │
  └───────────────────────────────────────────────┘

You: Which pins on the Uno Q can do PWM?

  [pre-router fired: uno-q-hardware, uno-q-hardware/pinout.md]
  Thinking... done (444.8s, finish=stop)

Sensai: D3, D5, D6, D9, D10, D11
```

Press `Ctrl+C` in either mode to stop everything cleanly.

---

## Step 6: Verify Sketch Compilation (Agentic Path Only)

In the agentic terminal, ask Sensai to compile a test sketch:

```
You: Use the arduino tool to compile a blink sketch for D9.
```

Sensai will call the `arduino` tool with `action=compile` internally. If compilation succeeds, it reports success. If there is an error, it reads the output, explains the problem in plain English, and fixes it.

To upload to the connected board:

```
You: Use the arduino tool to upload a blink sketch for D9.
```

**Naming the tool explicitly matters at 0.8B scale.** v3 evaluation found that ambient prompts ("write a blink sketch and upload it") sometimes produce a correct sketch in markdown without firing the tool. Directive prompts ("Use the arduino tool to upload...") trigger the tool reliably. See `docs/Sensai/eval/v3/sensai-eval-v3-run7.md` for the full analysis.

To check which boards are connected:

```
You: What boards are connected?
```

To verify the flash actually worked, watch the board's LED matrix or measure the GPIO with a multimeter — the agent's "success" message means the bytes are at the correct flash partition, not that the sketch ran (those are normally the same thing on the Uno Q, but the distinction matters if you suspect a bad sketch).

---

## Quick Reference: Make Targets

| Command | What it does |
|---|---|
| `make sensai` | Default — alias for `sensai-agentic` |
| `make sensai-agentic` | **Agentic path**: agent loop + 23-rule pre-router + 8 tools (compile/upload + camera + sysfs_led + network + i2cdetect + filesystem) |
| `make sensai-direct` | **Direct path**: same 23-rule pre-router + single LLM call, no tools (fast Q&A across 15 skills) |
| `make sensai-install` | Full first-time setup (build + workspace + arduino-cli + wizard) |
| `make sensai-onboard` | Re-run setup wizard (change Telegram token, allow list) |
| `make sensai-setup` | Reinstall system prompt and skills tree after a git pull |
| `make sensai-arduino-setup` | Install or update arduino-cli and the Uno Q board core |
| `make sensai-stop` | Stop background llama-server and gateway |
| `make sensai-tui` | Launch the graphical channel configuration panel |

---

## Auto-start on Boot (Optional)

To run llama-server automatically on boot (v3 flags):

```ini
# /etc/systemd/system/llama-server.service
[Unit]
Description=llama-server inference daemon
After=network.target

[Service]
ExecStart=/home/arduino/ArduinoApps/Sensai/yzma/lib/llama-server \
  -m /home/arduino/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 8192 --parallel 1 -t 4 \
  --flash-attn on --mlock \
  --cache-type-k q8_0 --cache-type-v q8_0 \
  --reasoning-budget 800
Restart=on-failure
User=arduino

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now llama-server
```

Students can then SSH in and run `make sensai-agentic` or `make sensai-direct` — llama-server is already warm and their session starts in seconds. Both launcher scripts detect a running llama-server on port 8080 and reuse it rather than starting a duplicate.

---

## Troubleshooting

**"Asking Sensai..." appears on Telegram but no response arrives**

1. Check llama-server: `ps aux | grep llama-server`
2. Check it is healthy: `curl http://127.0.0.1:8080/v1/models`
3. Run with debug logging: `./build/picoclaw gateway --debug`
4. Confirm `request_timeout` in `~/.picoclaw/config.json` is `1200` — the default 30s times out during model warm-up

**Responses are very slow (> 60 seconds)**

- Confirm `/no_think` is the first line of `~/.picoclaw/workspace/SOUL.md` — without it, Qwen3 generates reasoning tokens before every response, adding 30–120s
- Check RAM: `free -h` — llama-server needs ~1.3 GB free
- Try the smaller model: `Qwen3-0.6B-Q4_0.gguf` (~340 MB, ~2× faster)

**Sketch compilation fails**

- Confirm `arduino-cli` is installed: `arduino-cli version`
- Confirm the board core is installed: `arduino-cli core list`
- If missing, run: `make sensai-arduino-setup`
- Check arduino-cli is in PATH: run `source ~/.bashrc` then try again

**"model not found" error on startup**

Run `make sensai-setup` — reinstalls the config template with the `qwen-local` model entry.

---

## Updating Sensai

```bash
git pull origin sensai
make sensai-setup   # reinstall SOUL.md and IDENTITY.md
make build          # rebuild the binary
make sensai         # restart
```

---

## Verifying Performance

Target numbers for `Qwen3.5-0.8B-Q6_K` on Uno Q with optimized config (`--ctx-size 12288 --parallel 2`, `/no_think` active):

| Metric | Target |
|---|---|
| Time to first token | < 3s |
| Generation throughput | > 4 tok/s |
| End-to-end (80-word response) | < 25s |
| llama-server RAM | < 1.4 GB |
| Swap usage | 0 |
