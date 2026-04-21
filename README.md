# Sensai

<img width="1408" height="768" alt="AI Sensei" src="https://github.com/user-attachments/assets/ceffdfc2-8fe7-4a9e-8e94-aa0b866e638a" />

**Sensai** is an on-device AI coding assistant for the Arduino Uno Q — a patient, inquiry-based tutor that runs entirely on the board. No internet. No API keys. No cloud.

Students ask questions in plain English. Sensai writes a complete Arduino sketch, explains how it works, compiles it, uploads it to the board, and closes with a "what if" question that turns the answer into an experiment.

Built on [picoclaw](https://github.com/sipeed/picoclaw) · inference via [yzma](https://github.com/hybridgroup/yzma) · model: Qwen3.5-0.8B Q4_0

**v3 ships two execution paths** — agentic (with tools and compile/upload) and direct (fast Q&A). See "Two Execution Paths" below to choose.

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

# Start every session — pick one of two paths
make sensai-agentic    # full agent loop + tools (compile/upload workflows)
make sensai-direct     # direct API + pre-router (fast Q&A, no compile/upload)
```

`make sensai-install` handles everything: builds the binary, installs the system prompt and skills tree, downloads `arduino-cli`, installs the `arduino:zephyr` board core, and runs the interactive setup wizard. `make sensai` is an alias for `make sensai-agentic` (the production default).

---

## Two Execution Paths

v3 evaluation across 8 runs established that the optimal Sensai configuration depends on the task. Both paths share the same model, the same `SOUL.md`, and the same skills tree; they differ only in how the model is invoked.

| Aspect | `make sensai-agentic` | `make sensai-direct` |
|---|---|---|
| Agent loop (multi-iteration) | ✅ | ❌ (single call) |
| Tools available | **8**: read_file, write_file, list_dir, **arduino**, camera, sysfs_led, network, i2cdetect | None |
| Pre-router | ✅ (**23 rules** spanning 15 skills) | ✅ (same 23 rules, no schema) |
| Can compile sketches | ✅ via `arduino` tool | ❌ (text-only output) |
| Can upload to board (LED matrix, GPIO) | ✅ flashes STM32U585 at `0x8100000` via OpenOCD | ❌ |
| Can capture camera frames | ✅ via `camera` tool (V4L2 + GStreamer) | ❌ |
| Can drive MPU-side RGB LEDs | ✅ via `sysfs_led` tool | ❌ |
| Can report network state | ✅ via `network` tool (IP/gateway/hostname) | ❌ |
| Can scan Linux I²C buses | ✅ via `i2cdetect` tool | ❌ |
| Telegram gateway | ✅ | ❌ (terminal only) |
| Avg latency (0.8B, sketch prompt) | ~12–22 min/turn | ~5–13 min/turn |
| Avg latency (0.8B, factual prompt) | ~6 min/turn | ~5 min/turn |
| Sketch correctness (LED matrix) | ✅ canonical template | ❌ (model contradicts pre-router; "LCD" hallucination) |
| Factual correctness (pinout, voltage) | ✅ | ✅ |

**When to use which:**

- **Agentic (`make sensai`):** Sketch generation that ends in "upload it to the board," camera capture, GPIO/LED control from Linux, network diagnostics, I²C bus discovery — anything that ends in *an action on the hardware*. This is the production classroom default; students get end-to-end automation, the LED matrix actually scrolls, photos actually get taken.
- **Direct (`make sensai-direct`):** "Which pins do PWM?", "How does Bridge work?", "What is a Modulino?", "Explain INPUT_PULLUP." Fast factual answers — the same 15 skills are pre-router-inlined, but the response is text only. ~33% lower latency; better for high-throughput Q&A.

The agent loop's response-format scaffolding contributes real quality on complex code generation, not just tool-call mechanics. Direct confirmed that the pre-router alone is **necessary but not sufficient** for the harder prompts at 0.8B scale.

---

## Example Session (Agentic Path)

```
You: write a sketch that fades an LED on D9 in and out like breathing, then upload it

Sensai: Here is a breathing sketch using analogWrite on D9...

  [sketch shown]

  Compiling... OK
  Uploading... done — your LED is now breathing.

  What do you predict happens if you change 5 to 20 in the for loop?
  Try it and see whether the fade gets faster or slower.
```

## Example Session (Direct Path)

```
You: which pins on the Uno Q can do PWM?

  [pre-router fired: uno-q-hardware, uno-q-hardware/pinout.md]
  Thinking... done (444.8s, finish=stop)

Sensai: Based on the uno-q-hardware reference, the PWM-capable pins
        (marked with ~ on the silkscreen) are:

        **D3, D5, D6, D9, D10, and D11**
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
┌──────────────────────────────────────────────────────────────┐
│                    Sensai (this repo)                        │
│                                                              │
│  Path A — Agentic (make sensai-agentic / make sensai)        │
│  ┌────────────────────────────────────────────────────┐      │
│  │ picoclaw agent / gateway (Go)                      │      │
│  │   ├── channels/  (Telegram, terminal)              │      │
│  │   ├── pre-router (skill_preload.go, 23 rules)      │      │
│  │   ├── agent loop (multi-iter, tool dispatch)       │      │
│  │   └── tools (8):                                   │      │
│  │       • read_file / write_file / list_dir         │      │
│  │       • arduino ──► arduino-cli + OpenOCD@0x8100000│      │
│  │       • camera ──► gst-launch-1.0 v4l2src ! ...    │      │
│  │       • sysfs_led ──► /sys/class/leds/*/brightness │      │
│  │       • network ──► /proc/net/route + net.Interfaces│     │
│  │       • i2cdetect ──► /dev/i2c-* + i2cdetect -y -r │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Path B — Direct  (make sensai-direct)                       │
│  ┌────────────────────────────────────────────────────┐      │
│  │ sensai-direct-chat.py (terminal REPL)              │      │
│  │   ├── pre-router (same 23 rules, ported to Python) │      │
│  │   └── single LLM call · no tools · no loop         │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│                       │ HTTP loopback :8080                  │
│  llama-server  ◄──────────────────────────────────────       │
│    └── yzma/  (submodule, llama.cpp FFI)                     │
└──────────────────────────────────────────────────────────────┘
            │ SSH / Telegram / terminal
       Students and teachers
```

**Pre-router** (shared by both paths): `pkg/agent/skill_preload.go` scans the user message against **23 keyword regex rules** spanning **15 skills**. Each match inlines the corresponding `SKILL.md` and reference files into the system prompt before the LLM call — the model never has to call `read_file` for known skill content. Rule coverage by domain:

| Domain | Skills | Triggers |
|---|---|---|
| Sketch fundamentals | `sketch-patterns` (breathe/blink/button/pot/servo/can/dac/opamp/upload) | `breathe`, `blink`, `button`, `analogRead`, `servo`, `compile`, `upload`, `CAN bus`, `DAC`, `OPAMP`, … |
| LED matrix | `led-matrix` | `matrix`, `scroll`, `Arduino_LED_Matrix`, … |
| Hardware reference | `uno-q-hardware` (pinout/voltage/connectors/power) | `pin`, `5V`, `voltage`, `JDIGITAL`, `Qwiic`, `USB-C`, `VIN`, … |
| Dual-chip workflow | `bridge`, `arduino-app-lab` | `Bridge`, `Python + sketch`, `App Lab`, `Brick`, … |
| Linux-side capabilities | `wireless`, `vision`, `audio`, `linux-led` | `Wi-Fi`, `Bluetooth`, `camera`, `OpenCV`, `microphone`, `voice`, `red:user`, … |
| Plug-and-play sensors | `modulino` | `Modulino`, `ModulinoDistance`, … |

**Agentic path:** the agent loop drives multi-step workflows. The 8 tools cover compile/flash (`arduino`), still-image capture (`camera`), MPU LED control (`sysfs_led`), read-only network state (`network`), I²C bus discovery (`i2cdetect`), and workspace navigation (`read_file`, `write_file`, `list_dir`). The arduino tool compiles via `arduino-cli`, then flashes via `/opt/openocd/bin/openocd` directly to the STM32U585 sketch partition at `0x8100000`. (The pre-installed `arduino-flash` wrapper hardcodes the wrong address `0x80F0000` — see `docs/Sensai/architecture-study-bible.md` "Flash Layout" section for the root-cause analysis.)

**Direct path:** a thin Python REPL POSTs the pre-routed prompt directly to llama-server and prints the response. The same 23 pre-router rules fire (ported to Python), so the model sees the same skill content as the agentic path — but with no tools, it can't compile, flash, capture, or scan. Faster turnaround at the cost of action capability.

Everything runs locally over `127.0.0.1:8080`.

---

## Benchmarks (Arduino Uno Q · v3)

Model: `Qwen_Qwen3.5-0.8B-Q4_0.gguf` · `--ctx-size 8192 --parallel 1 --reasoning-budget 800` · `/no_think` active · t=0.3

### Per-prompt walltime — Agentic vs Direct

Walltimes are full end-to-end (cold prefill + decode) on a fresh server. The agentic path adds tool-call iterations and an 8-tool schema (~3,400 chars) to the prompt; the direct path has neither. (The benchmark measurements below were taken with the older 4-tool schema; Wave 2/3 capabilities added 4 more tools but the per-prompt walltime overhead from the larger schema is bounded.)

| Prompt | Direct | Agentic | Direct quality | Agentic quality |
|---|---|---|---|---|
| `breathe` (fade D9) | 675s | n/a (Run 6 baseline: 533s) | ⚠️ partial — extra Serial spam | ✅ canonical |
| `blink` (D13, 1Hz) | **357s** | n/a | ✅ correct | ✅ correct |
| `pot` (analogRead A0) | 704s | n/a | ❌ broken (logic in setup()) | ✅ correct |
| `button` (D2 → D13) | 703s | n/a | ⚠️ duplicate comments | ✅ correct |
| `pwm_pins` (factual) | **445s** | n/a | ✅ D3/D5/D6/D9/D10/D11 | ✅ identical |
| `five_volt` (safety) | **568s** | n/a | ✅ "No, 3.3V max" | ✅ identical |
| `mpu_vs_mcu` (concept) | **333s** | n/a | ✅ correct | ✅ identical |
| `led_matrix` (scroll + upload) | 788s | **1168s** | ❌ "LCD" hallucination, SCROLL_RIGHT, no padding | ✅ canonical sketch (markdown only on ambient prompt; flashes when directive prompt used — see Demo 2/3) |
| `compile_blink` (write + upload) | 926s, **finish=length** | **1339s** | ❌ catastrophic tokenizer loop | ❌ Serial.println repetition loop |

Aggregate over 9 prompts: Direct = 4/9 correct, 2/9 partial, 3/9 broken (91.6 min total). Agentic on the 2 capability prompts = sketch quality ✅ but tool-call only fires on directive prompts naming the `arduino` tool explicitly.

### Token economy

| Configuration | System prompt size | Tool schema | Per-turn cost |
|---|---|---|---|
| v2 (pre-skills) | 2,571 tokens inline rules | n/a | causes reasoning loops on 0.8B |
| v3 agentic | ~9,500 + ~1,800 tool schema + ~7K pre-router | 4 tools | ~20K chars |
| v3 direct | ~9,500 + ~7K pre-router | none | ~16K chars |

### Demo 2 — physical board verification

The agentic path successfully flashed "Sensai" scrolling on the Arduino Uno Q's 13×8 blue LED matrix. Prompt: *"Use the arduino tool to upload a sketch that scrolls 'Sensai' across the Uno Q's LED matrix."* The agent compiled and flashed via OpenOCD at `0x8100000`; the LED matrix lit up in ~31 seconds for the tool call. Demo flow documented in `docs/Sensai/architecture-study-bible.md`.

### Adreno 702 OpenCL Prefill Acceleration (planned, not yet shipping)

| Phase | CPU-only | OpenCL | Gain |
|---|---|---|---|
| Prefill TTFT | ~28s | ~4–9s | 5–13× |
| Decode tok/s | ~8–12 | ~8–12 | No change* |

*Decode is memory-bandwidth-bound; GPU shares the same LPDDR4X bus.

---

## Make Targets

| Command | What it does |
|---|---|
| `make sensai` | Default — alias for `make sensai-agentic` |
| `make sensai-agentic` | **Agentic path**: agent loop + pre-router + 8 tools (read/write/list/arduino/camera/sysfs_led/network/i2cdetect). Can compile/flash sketches, capture camera frames, drive MPU LEDs, scan I²C buses. |
| `make sensai-direct` | **Direct path**: pre-router + single LLM call, no tools, no loop. Fast Q&A across all 15 skills. Cannot perform hardware actions. |
| `make sensai-install` | Full first-time setup (build + workspace + arduino-cli + wizard) |
| `make sensai-onboard` | Re-run setup wizard (update Telegram token, allow list) |
| `make sensai-setup` | Reinstall system prompt + skills tree after a git pull |
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
│   ├── IDENTITY.md         # Identity file
│   └── skills/             # Pre-router-loaded skill bundles (Uno Q-specific)
│       ├── sketch-patterns/    # Canonical .ino templates: blink, breathe, button, pot,
│       │                       # servo, upload + can, dac, opamp
│       ├── led-matrix/         # 13×8 blue LED matrix (scroll text, draw frames)
│       ├── uno-q-hardware/     # Pin tables, voltage rules, connectors, power, MPU/MCU split
│       ├── bridge/             # RPC between Python (MPU) and sketch (MCU)
│       ├── wireless/           # Wi-Fi (WCN3980), Bluetooth, Bridge-to-network pattern
│       ├── vision/             # MIPI-CSI-2 camera, V4L2, GStreamer, OpenCV
│       ├── audio/              # Mic2/Headphone/LineOut, ALSA, voice recognition
│       ├── arduino-app-lab/    # App Lab workflow, Bricks, deployment
│       ├── modulino/           # Plug-and-play I²C Modulino sensors (Qwiic)
│       └── linux-led/          # MPU-side RGB LEDs via sysfs (no sketch needed)
├── scripts/
│   ├── sensai-launch.sh        # Agentic path: llama-server + gateway + agent terminal
│   ├── sensai-launch-direct.sh # Direct path: llama-server + Python REPL
│   ├── sensai-direct-chat.py   # Interactive direct-API REPL
│   ├── sensai-onboard.sh       # Interactive setup wizard
│   └── arduino-cli-setup.sh    # Installs arduino-cli + arduino:zephyr core
├── assets/sensai-logo.svg  # Sensai brand logo
├── docs/Sensai/            # Guides and technical references (see below)
└── Makefile
```

---

## Docs

| Document | Description |
|---|---|
| `docs/Sensai/teacher-guide.md` | Deployment, classroom use, choosing agentic vs direct, IBL pedagogy, SSH setup, troubleshooting |
| `docs/Sensai/student-guide.md` | How to talk to Sensai, what it can do, example conversation |
| `docs/Sensai/sensai-setup-walkthrough.md` | Step-by-step from fresh board to running Sensai |
| `docs/Sensai/architecture-study-bible.md` | Deep-dive: dual-processor architecture, pin tables, hardware constants, v3 agentic vs direct paths, flash partition fix |
| `docs/Sensai/UnoQ-datasheet.pdf` | Official Arduino Uno Q hardware datasheet |

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
