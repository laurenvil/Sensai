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
make sensai               # Start llama-server + gateway + terminal chat
make sensai-setup         # Reinstall SOUL.md and IDENTITY.md (safe to re-run)
make sensai-onboard       # Interactive wizard: Telegram token, allow list
make sensai-arduino-setup # Install arduino-cli + arduino:zephyr core (idempotent)
make sensai-stop          # Kill background llama-server and gateway PIDs
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
- Optimal llama-server flags: `--ctx-size 12288 --parallel 2`
- OpenCL prefill acceleration (5–13× TTFT) requires building llama.cpp with the OpenCL backend; see `docs/Sensai/Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md`.
- **Upcoming**: Arduino Ventuno Q — ARMv9, Hexagon NPU (40 TOPS), 16 GB LPDDR5; see `docs/Sensai/Ventuno_Q_GPU_Enhanced_Prefill_Decode_Whitepaper_Yzma_Qwen3.md`.

## Docs (`docs/Sensai/`)

| Document | Purpose |
|---|---|
| `teacher-guide.md` | Deployment, classroom use, IBL pedagogy, SSH setup |
| `student-guide.md` | Student-facing: how to use Sensai, what it can do |
| `development/sensai-setup-walkthrough.md` | Step-by-step from fresh board to running Sensai |
| `development/architecture-study-bible.md` | Hardware architecture, pin tables, voltage rules |
| `development/implementation-plan.md` | Feature roadmap and phase status |
| `development/UnoQ-datasheet.pdf` | Official Uno Q hardware datasheet |
| `Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md` | GPU prefill acceleration research |
| `Decode_Throughput_Optimization_Whitepaper_Yzma_Qwen3_Arduino_Uno_Q.md` | Decode throughput optimization |
| `Ventuno_Q_GPU_Enhanced_Prefill_Decode_Whitepaper_Yzma_Qwen3.md` | Ventuno Q future inference path |
