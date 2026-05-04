# Sensai

<img width="1408" height="768" alt="AI Sensei" src="https://github.com/user-attachments/assets/ceffdfc2-8fe7-4a9e-8e94-aa0b866e638a" />

**Sensai** is an on-device AI coding assistant for the Arduino Uno Q — a patient, inquiry-based tutor that runs entirely on the board. No internet. No API keys. No cloud.

Students ask questions in plain English. Sensai writes a complete Arduino sketch, explains how it works, compiles it, uploads it to the board, and closes with a "what if" question that turns the answer into an experiment.

Built on [picoclaw](https://github.com/sipeed/picoclaw) · inference via [yzma](https://github.com/hybridgroup/yzma) · model: Qwen3.5-0.8B Q6_K

---

## What Sensai Does

| Capability | Details |
|---|---|
| **Terminal chat** | Type questions at the `You:` prompt; Sensai responds in seconds |
| **Telegram** | Students message the class bot from any phone or laptop |
| **SSH access** | Multiple students connect via `ssh arduino@<board-ip>` on the local network |
| **Sketch compilation** | Sensai calls `arduino-cli compile` and reports errors in plain English |
| **Sketch upload** | Sensai calls `arduino-cli upload` — code lands on the board without leaving the chat |
| **Board detection** | Ask "what boards are connected?" — Sensai runs `arduino-cli board list` |
| **Fully offline** | All inference, compilation, and upload runs on the Uno Q — nothing leaves the classroom |

---

## Quick Start

```bash
git clone https://github.com/laurenvil/Sensai.git ~/ArduinoApps/Sensai
cd ~/ArduinoApps/Sensai
git checkout sensai
git submodule update --init --recursive

# Download the inference engine
cd yzma && make download-llama.cpp && cd ..

# Download the AI model (~700 MB)
mkdir -p ~/models
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q6_K.gguf'

# Build, install arduino-cli, configure (one time)
make sensai-install

# Start every session
make sensai
```

`make sensai-install` handles everything: builds the binary, installs the system prompt, downloads `arduino-cli`, installs the `arduino:zephyr` board core, and runs the interactive setup wizard.

---

## Example Session

```
You: write a sketch that fades an LED on D9 in and out like breathing, then upload it

Sensai: Here is a breathing sketch using analogWrite on D9...

  [sketch shown]

  Compiling... OK
  Uploading... done — your LED is now breathing.

  What do you predict happens if you change 5 to 20 in the for loop?
  Try it and see whether the fade gets faster or slower.
```

---

## Hardware Target

### Arduino Uno Q (primary)
- **SoC**: Qualcomm Dragonwing QRB2210
- **CPU**: 4× Cortex-A53 @ 2.0 GHz (ARMv8.0)
- **GPU**: Adreno 702 @ 845 MHz — OpenCL 2.0
- **RAM**: 4 GB LPDDR4X
- **OS**: Debian Linux, kernel 6.16
- **MCU**: STM32U585 (Zephyr OS + Arduino Core) — where sketches run

### Arduino Ventuno Q (upcoming)
- **SoC**: Qualcomm Dragonwing IQ-8275
- **CPU**: 8-core Kryo Gen 6 (ARMv9)
- **NPU**: Hexagon Tensor Processor, 40 TOPS INT8
- **RAM**: 16 GB LPDDR5

---

## Architecture

```
┌─────────────────────────────────────────────┐
│               Sensai (this repo)            │
│                                             │
│  picoclaw agent / gateway  (Go)             │
│    ├── channels/  (Telegram, terminal)      │
│    ├── providers/ (OpenAI-compat HTTP)      │
│    ├── agent loop (tool dispatch, history)  │
│    └── tools/arduino.go ──► arduino-cli     │
│                │ HTTP loopback              │
│  llama-server  ◄──────────────────────────  │
│    └── yzma/  (submodule, llama.cpp FFI)    │
└─────────────────────────────────────────────┘
        │ SSH / Telegram / terminal
   Students and teachers
```

The agent loop receives a student question, builds context from `SOUL.md` (the Sensai persona and hardware knowledge base), calls the model, and dispatches tool calls. The `arduino` tool wraps `arduino-cli` for compile/upload. Everything runs locally over `127.0.0.1:8080`.

---

## Benchmarks (Arduino Uno Q)

Model: `Qwen3.5-0.8B-Q6_K` · `--ctx-size 12288 --parallel 2` · `/no_think` active

| Metric | Value |
|---|---|
| Time to first token | ~2.25s |
| Generation throughput | ~4.43 tok/s |
| End-to-end (50-word response) | 5–10s |
| End-to-end (200-word sketch) | 35–50s |
| llama-server RAM | ~1.3 GB |
| Swap dependency | None |

### Adreno 702 OpenCL Prefill Acceleration

| Phase | CPU-only | OpenCL | Gain |
|---|---|---|---|
| Prefill TTFT | ~28s | ~4–9s | 5–13× |
| Decode tok/s | ~8–12 | ~8–12 | No change* |

*Decode is memory-bandwidth-bound; GPU shares the same LPDDR4X bus.

---

## Make Targets

| Command | What it does |
|---|---|
| `make sensai` | Start Sensai for the session |
| `make sensai-install` | Full first-time setup |
| `make sensai-onboard` | Re-run setup wizard (update Telegram token, allow list) |
| `make sensai-setup` | Reinstall system prompt after a git pull |
| `make sensai-arduino-setup` | Install or update arduino-cli and the Uno Q board core |
| `make sensai-stop` | Stop background processes |
| `make build` | Build the picoclaw binary for current platform |
| `make build-linux-arm64` | Cross-compile for Uno Q (ARM64) |

---

## Repository Layout

```
Sensai/
├── cmd/picoclaw/           # CLI entry point (Cobra)
├── pkg/
│   ├── agent/              # Agent loop, context, tool dispatch
│   ├── channels/           # Telegram, terminal, IRC, Matrix, …
│   ├── providers/          # LLM provider adapters (OpenAI-compat, Anthropic, …)
│   └── tools/
│       ├── arduino.go      # Compile/upload sketches via arduino-cli
│       ├── i2c.go          # I2C hardware tool (Linux)
│       └── spi.go          # SPI hardware tool (Linux)
├── yzma/                   # Submodule → hybridgroup/yzma (llama.cpp FFI)
├── config/sensai.config.json  # Sensai runtime config template
├── workspace/
│   ├── SOUL.md             # System prompt: Sensai persona + hardware knowledge
│   └── IDENTITY.md         # Identity file
├── scripts/
│   ├── sensai-launch.sh    # Starts llama-server + gateway + terminal chat
│   ├── sensai-onboard.sh   # Interactive setup wizard
│   └── arduino-cli-setup.sh  # Installs arduino-cli + arduino:zephyr core
├── assets/sensai-logo.svg  # Sensai brand logo
├── docs/Sensai/            # Guides and technical references (see below)
└── Makefile
```

---

## Docs

| Document | Description |
|---|---|
| `docs/Sensai/teacher-guide.md` | Deployment, classroom use, IBL pedagogy, SSH setup, troubleshooting |
| `docs/Sensai/student-guide.md` | How to talk to Sensai, what it can do, example conversation |
| `docs/Sensai/development/sensai-setup-walkthrough.md` | Step-by-step from fresh board to running Sensai |
| `docs/Sensai/development/architecture-study-bible.md` | Deep-dive: dual-processor architecture, pin tables, hardware constants |
| `docs/Sensai/development/implementation-plan.md` | Phase-by-phase feature roadmap and implementation status |
| `docs/Sensai/development/UnoQ-datasheet.pdf` | Official Arduino Uno Q hardware datasheet |
| `docs/Sensai/Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md` | Adreno 702 OpenCL backend: 5–13× TTFT reduction |
| `docs/Sensai/Decode_Throughput_Optimization_Whitepaper_Yzma_Qwen3_Arduino_Uno_Q.md` | Maximizing decode tok/s on LPDDR4X bandwidth ceiling |
| `docs/Sensai/Ventuno_Q_GPU_Enhanced_Prefill_Decode_Whitepaper_Yzma_Qwen3.md` | Ventuno Q inference: Adreno 623 + Hexagon NPU path |

---

## Upstream & Submodule

```bash
# Sync with upstream picoclaw
git fetch upstream
git merge upstream/main

# Update yzma submodule
git submodule update --remote yzma
git add yzma && git commit -m "chore: update yzma submodule"
```

---

## License

picoclaw: MIT · yzma: Apache-2.0
