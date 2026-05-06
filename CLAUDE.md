# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

**Sensai** is a fork of [picoclaw](https://github.com/sipeed/picoclaw) tuned for on-device AI inference on Arduino Uno Q (Qualcomm QRB2210) and Ventuno Q (IQ-8275) hardware. It is an educational AI assistant that writes, compiles, and uploads Arduino sketches — running entirely offline on the board. It bundles [yzma](https://github.com/hybridgroup/yzma) (Go/llama.cpp FFI via `purego`, no CGo) as a git submodule at `yzma/`. The Go module path is `github.com/sipeed/picoclaw`.

## Commands

```bash
# Build for current platform (runs go generate first)
make build              # → build/picoclaw

# Run tests
make test               # go test ./...

# Run a single test package
CGO_ENABLED=0 go test -v -tags stdjson ./pkg/agent/...

# Lint
make lint               # golangci-lint run
make fmt                # golangci-lint fmt
make fix                # golangci-lint run --fix

# Cross-compile
make build-linux-arm64  # ARM64 (Uno Q target)
make build-all          # all platforms

# Run after building
make run ARGS="agent"
./build/picoclaw agent --debug

# Docker
make docker-build       # Alpine-based
make docker-run         # starts gateway
```

Build uses `CGO_ENABLED=0` and `-tags stdjson`. The binary is named `picoclaw-<platform>-<arch>` with a `picoclaw` symlink.

### Sensai-specific targets

```bash
make sensai-install       # Full first-time setup: build + workspace + arduino-cli + wizard
make sensai               # Start CPU llama-server (yzma) + gateway + terminal chat
make sensai-gpu           # Start GPU llama-server (Wang/OpenCL, Adreno 702) + gateway + terminal chat
make sensai-setup         # Reinstall SOUL.md and IDENTITY.md (safe to re-run)
make sensai-onboard       # Interactive wizard: Telegram token, allow list
make sensai-arduino-setup # Install arduino-cli + arduino:zephyr core (idempotent)
make sensai-stop          # Kill background llama-server and gateway PIDs (CPU path)
make sensai-gpu-stop      # Kill background GPU llama-server and gateway PIDs
make sensai-tui           # Launch picoclaw-launcher TUI
```

## Architecture

`llama-server` exposes OpenAI-compatible HTTP at `127.0.0.1:8080/v1`. The picoclaw gateway sits on top: handles channel routing, the agent loop, and tool dispatch. Students interact via terminal, SSH, or Telegram.

### Package layout (`pkg/`)

| Package | Role |
|---|---|
| `pkg/agent` | Core agent loop (`AgentLoop`), context/history management, memory, MCP integration, tool dispatch |
| `pkg/providers` | LLM provider abstraction — OpenAI-compat, Anthropic, Azure, Claude CLI, Codex CLI, GitHub Copilot, fallback chain |
| `pkg/channels` | Chat channel adapters (Telegram, Discord, Slack, Feishu, WeChat Work, IRC, Matrix, LINE, QQ, WhatsApp, DingTalk, MaixCam, Pico) |
| `pkg/tools` | Built-in tools: shell, filesystem, web search, cron, **arduino** (compile/upload via arduino-cli), I2C/SPI (Linux), MCP tool proxy, subagent, send-file |
| `pkg/bus` | Internal pub/sub message bus between agent loop and channels |
| `pkg/config` | Config loading (JSON + env vars), migrations, version info |
| `pkg/skills` | Skill discovery and installation from workspace |
| `pkg/commands` | Slash-command registry |
| `pkg/state` | Session state and history persistence |
| `pkg/auth` | OAuth/PKCE, token storage, Anthropic usage tracking |

### Key data flows

1. A channel adapter (e.g. `pkg/channels/telegram`) receives a message and publishes it on `pkg/bus`.
2. `AgentLoop` (in `pkg/agent/loop.go`) subscribes to the bus, builds context (system prompt from `~/.picoclaw/workspace/SOUL.md`, message history), and calls the active provider via `FallbackChain`.
3. If the model emits tool calls, `AgentLoop` dispatches them through `pkg/tools` (or MCP via `loop_mcp.go`) and loops.
4. Responses are routed back to the originating channel.

### Arduino tool (`pkg/tools/arduino.go`)

Implements the Tool interface for `arduino-cli` integration. Actions:
- `compile` — writes sketch to `os.MkdirTemp` as `<dir>/<dir>.ino`, runs `arduino-cli compile --fqbn <board>`
- `upload` — same as compile plus `--upload --port <port>`
- `detect` — runs `arduino-cli board list`

Configured via `ArduinoToolConfig` in `pkg/config/config.go`. Registered in `pkg/agent/loop.go` alongside the I2C/SPI hardware tools. Enabled in `config/sensai.config.json` with FQBN `arduino:zephyr:unoq`. SOUL.md instructs the model when to invoke it.

### Tool registration pattern

Tools are registered in `pkg/agent/loop.go` (hardware tools) or `pkg/agent/instance.go` (general tools):

```go
if cfg.Tools.IsToolEnabled("arduino") {
    agent.Tools.Register(tools.NewArduinoTool(
        cfg.Tools.Arduino.FQBN,
        cfg.Tools.Arduino.Port,
        cfg.Tools.Arduino.Protocol,
    ))
}
```

To add a new tool: implement `Name()`, `Description()`, `Parameters()`, `Execute()` in `pkg/tools/`, add a config struct in `pkg/config/config.go`, add a case to `IsToolEnabled()`, register in `loop.go` or `instance.go`, and enable in `config/sensai.config.json`.

### Channel registration pattern

Each channel subpackage has an `init.go` that calls `channels.Register(...)` in its `init()` function. Channels are activated based on env vars / config keys at startup.

### Provider selection

`pkg/providers/factory.go` reads config and constructs the provider chain. The primary inference target for Sensai is the `openai_compat` provider pointed at `http://127.0.0.1:8080/v1` (llama-server).

## Configuration

Runtime config lives at `~/.picoclaw/` (overridable via `PICOCLAW_HOME`):
- `config.json` — copied from `config/sensai.config.json` on first `make sensai-setup`
- `workspace/SOUL.md` — system prompt; `/no_think` must be first line to suppress Qwen3 reasoning tokens
- `workspace/IDENTITY.md` — identity file
- `workspace/skills/` — installed skills

Recommended settings for Uno Q (already in `config/sensai.config.json`):
```json
"api_base": "http://127.0.0.1:8080/v1",
"model": "qwen-local",
"max_tokens": 4096,
"request_timeout": 1200
```

## Submodule (yzma)

```bash
git submodule update --init --recursive
cd yzma && make download-llama.cpp   # downloads llama.cpp shared libs
```

The yzma binaries (`llama-cli`, `llama-server`) live at `yzma/lib/`.

## Linting

`golangci-lint` v2 with a custom `.golangci.yaml`. Formatters enforced: `gci`, `gofmt`, `gofumpt`, `goimports`, `golines` (max 120 chars). Import order: standard → third-party → local (`github.com/sipeed/picoclaw`). Run `make fmt` before committing.

## Hardware Notes

- **Primary target**: Arduino Uno Q — 4× Cortex-A53, 4 GB LPDDR4X, Adreno 702 (OpenCL 2.0). Build with `make build-linux-arm64`.
- MCU side (where sketches run): STM32U585, Zephyr OS + Arduino Core. FQBN: `arduino:zephyr:unoq`.
- Optimal CPU llama-server flags: `--ctx-size 12288 --parallel 2`
- **Upcoming**: Arduino Ventuno Q — ARMv9, Hexagon NPU (40 TOPS), 16 GB LPDDR5.

## GPU Inference (Adreno 702 / Mesa RustiCL)

Two distinct llama-server binaries serve the CPU and GPU paths:

| Path | Binary | Launch |
|---|---|---|
| **CPU** (production) | `yzma/lib/llama-server` (pre-compiled, CPU-only) | `make sensai` |
| **GPU** (research/experimental) | `~/ArduinoApps/llama-wang/build/bin/llama-server` (Wang/OpenCL build) | `make sensai-gpu` |

### GPU quick start

```bash
# 1. Build Wang's llama-server with OpenCL + Adreno patches
git clone https://github.com/wanghqc/llama.cpp -b opencl/nvidia ~/ArduinoApps/llama-wang
cd ~/ArduinoApps/llama-wang
# Apply Adreno 702 patches — see docs/Sensai/opencl-gpu-improvement-roadmap.md
cmake -B build -DGGML_OPENCL=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build --target llama-server -j4

# 2. Ensure Mesa rusticl is installed
sudo apt install mesa-opencl-icd

# 3. Use a pure Q4_0 model (no Q6_K tensors — required for FD702 stability)
# Model: ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf

# 4. Launch
make sensai-gpu
```

### GPU environment

`make sensai-gpu` sets these automatically via `scripts/sensai-gpu-launch.sh`:

```bash
RUSTICL_ENABLE=freedreno      # activates Mesa rusticl for FD702
MESA_OPENCL_OVERRIDE=1        # suppresses non-Freedreno device warnings
LD_LIBRARY_PATH=<wang-build>  # Wang-branch OpenCL runtime libs
```

Key GPU flags: `--ctx-size 512 --parallel 1 -t 2 -ngl 999 --no-flash-attn`

- `--no-flash-attn` — flash-attn kernel exceeds 16 KB local mem limit on FD702
- `--ctx-size 512` — keeps batch within single-CU GPU TDR watchdog budget (~5s)
- `-ngl 999` — offload all layers; Q6_K tensors auto-fall-back to CPU via `supports_op()`

### GPU vs CPU performance (v4.4 benchmark)

| Metric | CPU (`-t 4`) | GPU (`-ngl 999`, `-p 32`) |
|---|---|---|
| Prefill | 8.1 t/s | 4.23 t/s |
| Generation | 3.2 t/s | ~2.7 t/s |

The CPU is currently faster for this model size on the Adreno 702's single Compute Unit. GPU remains valuable as a research path toward Mesa driver maturation and the future Hexagon NPU. See `docs/Sensai/opencl-gpu-improvement-roadmap.md` for the full gap analysis and roadmap.

## Docs (`docs/Sensai/`)

| Document | Purpose |
|---|---|
| `teacher-guide.md` | Deployment, classroom use, IBL pedagogy, SSH setup |
| `student-guide.md` | Student-facing: how to use Sensai, what it can do |
| `development/sensai-setup-walkthrough.md` | Step-by-step from fresh board to running Sensai |
| `development/architecture-study-bible.md` | Hardware architecture, pin tables, voltage rules |
| `development/implementation-plan.md` | Feature roadmap and phase status |
| `development/UnoQ-datasheet.pdf` | Official Uno Q hardware datasheet |
| `Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md` | Original March 2026 GPU whitepaper (Qualcomm proprietary ICD plan) |
| `opencl-gpu-improvement-roadmap.md` | Gap analysis + improvement roadmap (Mesa RustiCL actual results) |
| `kgsl-proprietary-icd-investigation.md` | Deep-dive: KGSL vs DRM_MSM driver stacks, why proprietary ICD is unavailable on Debian BSP |
| `adreno-702-optimization-consolidated.md` | Engineering journey: blockers, breakthroughs, benchmarks |
| `adreno-gpu-comparative-analysis.md` | Proprietary vs open-source driver path comparison |
| `eval/` | Sensai evaluation results (v2 through v4.4) |
