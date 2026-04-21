# Sensai
<img width="1408" height="768" alt="Arduino AI Assistant" src="https://github.com/user-attachments/assets/36e314de-3842-4155-979d-d5fe00e7afaa" />

**Sensai** is my production fork of [picoclaw](https://github.com/sipeed/picoclaw), optimized for on-device AI inference on Arduino Uno Q and Arduino Ventuno Q hardware. It bundles [yzma](https://github.com/hybridgroup/yzma) (Go/llama.cpp FFI bindings) as a submodule and documents the full stack required to run a local, cloud-free AI assistant on Qualcomm Dragonwing embedded Linux boards.

Upstream: [sipeed/picoclaw](https://github.com/sipeed/picoclaw) · Yzma submodule: [hybridgroup/yzma](https://github.com/hybridgroup/yzma)

---

## What This Fork Adds

| Area | What Sensai Does Differently |
|---|---|
| **Hardware target** | Tuned for Arduino Uno Q (QRB2210) and Ventuno Q (IQ-8275) |
| **Inference backend** | Yzma submodule at `yzma/` — direct llama.cpp FFI, no CGo |
| **GPU acceleration** | Adreno 702 OpenCL prefill path (5–13× TTFT improvement) |
| **Model** | Qwen3-0.6B Q4_0 / Qwen3.5-0.8B Q6_K — fits within 4 GB |
| **Docs** | Engineering whitepapers and benchmarks in `docs/Sensai/` |

---

## Hardware Targets

### Arduino Uno Q (primary)
- **SoC**: Qualcomm Dragonwing QRB2210
- **CPU**: 4× Cortex-A53 @ 2.0 GHz (ARMv8.0)
- **GPU**: Adreno 702 @ 845 MHz — OpenCL 2.0, Vulkan 1.1
- **RAM**: 4 GB LPDDR4X (~3.5 GB/s effective bandwidth)
- **OS**: Debian Linux, kernel 6.16

### Arduino Ventuno Q (upcoming, Q2 2026)
- **SoC**: Qualcomm Dragonwing IQ-8275
- **CPU**: 8-core Kryo Gen 6 (ARMv9, out-of-order)
- **GPU**: Adreno 623 (~500–1000 GFLOPS)
- **NPU**: Hexagon Tensor Processor, 40 TOPS INT8
- **RAM**: 16 GB LPDDR5 @ 3200 MHz (~20–30 GB/s effective)
- **Target**: sub-1s TTFT, 50–80 tok/s decode (5–8× over Uno Q)

---

## Architecture

```
┌─────────────────────────────────────┐
│         Sensai (this repo)          │
│                                     │
│  picoclaw agent gateway  (Go)       │
│    ├── channels/ (Telegram, etc.)   │
│    ├── providers/ (OpenAI-compat)   │
│    └── agent loop                   │
│                │ HTTP loopback      │
│  llama-server  ←──────────────────  │
│    └── yzma/  (submodule)           │
│         └── llama.cpp FFI (purego)  │
└─────────────────────────────────────┘
```

**picoclaw** runs as the agent gateway: handles Telegram messages, tool execution, and the agent loop. It calls the inference backend over a local OpenAI-compatible HTTP API (`http://127.0.0.1:8080/v1`).

**yzma** provides Go bindings to llama.cpp shared libraries via `purego`/`ffi` — no CGo, standard `go build`. Used as the inference engine via `llama-server` or directly in-process.

---

## Benchmarks (Arduino Uno Q)

Model: `Qwen_Qwen3.5-0.8B-Q6_K.gguf` · Configuration: `--ctx-size 12288 --parallel 2` · `/no_think` active

| Metric | v1 Baseline | v4 Final | Change |
|---|---|---|---|
| Total wall time | ~671s | **4.50s** | ↓ 149× |
| Completion tokens | 864 | 10 | ↓ 98.8% |
| Generation throughput | 1.29 tok/s | **4.43 tok/s** | ↑ +243% |
| Prompt throughput | 4.12 tok/s | 6.12 tok/s | ↑ +49% |
| Time to first token | ~2.67s | 2.25s | ↓ 16% |
| KV cache memory | 3,072 MiB | 144 MiB | ↓ 95.3% |
| Total llama-server RAM | ~4,566 MiB | ~1,301 MiB | ↓ 71.5% |
| Swap dependency | Yes | **No** | Eliminated |

> Key optimizations: reduced ctx window (262144 → 12288), reduced parallel slots (4 → 2), `/no_think` in `SOUL.md`, single-user benchmark conditions.

### GPU Prefill Acceleration (Adreno 702 OpenCL)

For Qwen3-0.6B Q4_0, enabling the llama.cpp OpenCL backend on the Adreno 702:

| Phase | CPU-only | OpenCL (est.) | Gain |
|---|---|---|---|
| Prefill TTFT | ~28s | ~4–9s | 5–13× |
| Decode tok/s | ~8–12 tok/s | ~8–12 tok/s | No change* |

*Decode is memory-bandwidth-bound; GPU shares the same LPDDR4X bus.

---

## Getting Started

### Prerequisites

```bash
# Initialize yzma submodule
git submodule update --init --recursive
cd yzma
make download-llama.cpp   # download llama.cpp shared libraries
```

---

## Option A: Standalone Inference — No Gateway Required

You do not need the Sensai agent layer to run LLM inference on the Uno Q. The yzma inference stack operates in two modes: a direct terminal conversation via `llama-cli`, or an HTTP server via `llama-server` that any script or app can query. Start with terminal mode — it requires no server and no running process.

### 1. Terminal chat (simplest — no server needed)

`llama-cli` opens a back-and-forth conversation directly in the terminal. The Qwen3 GGUF embeds its own chat template, so conversation mode activates automatically:

```bash
./yzma/lib/llama-cli \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  -t 4 \
  -c 4096 \
  --mlock \
  --temp 0.6 \
  --top-k 20 --top-p 0.95
```

Type your question and press Enter. The model responds, then waits for your next message. Type `/bye` or press `Ctrl+C` to exit.

```
> I want my LED to fade in and out slowly, like breathing.

That's called a breathing effect. You can achieve it with analogWrite on
a PWM-capable pin — pin 9 on the Uno Q works well. Here's a sketch...
```

### 2. HTTP server (for scripts, web UIs, and multi-user classrooms)

When you need multiple students to query the model at the same time, or want to integrate it into a Python script or app, start `llama-server`:

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2
```

This exposes an OpenAI-compatible REST API at `http://127.0.0.1:8080/v1`. Test it with:

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen",
    "messages": [{"role": "user", "content": "Blink an LED on pin 13 every 500ms"}],
    "max_tokens": 512
  }'
```

**Python (no SDK needed):**
```python
import urllib.request, json

payload = json.dumps({
    "model": "qwen",
    "messages": [{"role": "user", "content": "Blink an LED on pin 13 every 500ms"}],
    "max_tokens": 512
}).encode()

req = urllib.request.Request(
    "http://127.0.0.1:8080/v1/chat/completions",
    data=payload,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    print(json.loads(r.read())["choices"][0]["message"]["content"])
```

**Any OpenAI-compatible client** — point `base_url` at `http://127.0.0.1:8080/v1` with any dummy API key.

### 3. Auto-start on boot (optional)

```ini
# /etc/systemd/system/llama-server.service
[Unit]
Description=llama-server inference daemon
After=network.target

[Service]
ExecStart=/path/to/yzma/lib/llama-server \
  -m /home/user/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now llama-server
```

> **When to use standalone inference:** prototyping, classroom demos, embedding AI into your own application, or any scenario where you want direct control over every prompt without an agent layer in between.

---

## Option B: Full Stack — llama-server + picoclaw Gateway

The picoclaw agent layer adds conversation management, tool execution, channel routing (Telegram, web UI, terminal), and the agent loop on top of the same llama-server backend. Use this when you want a ready-made conversational AI assistant rather than raw inference.

### Build and run

```bash
# Build picoclaw agent
make build           # → ./build/picoclaw

cp .env.example .env   # fill in Telegram token + model config
./build/picoclaw agent
```

Recommended `.env` / model config:
```
api_base=http://127.0.0.1:8080/v1
model=Qwen_Qwen3.5-0.8B-Q6_K.gguf
max_tokens=4096
request_timeout=1200
```

Add `/no_think` to `~/.picoclaw/workspace/SOUL.md` to suppress reasoning tokens.

---

## Running from the Arduino App Lab Terminal

Arduino App Lab is the built-in IDE and app environment on the Uno Q. Open the terminal from the `>_` icon in the sidebar, then navigate to the project:

```bash
cd /home/arduino/ArduinoApps/Sensai
```

### Option A — Terminal chat via yzma (no gateway)

Talks directly to the model via yzma's `llama-cli`. No build step, no server needed:

```bash
./yzma/lib/llama-cli \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  -t 4 -c 4096 --mlock \
  --temp 0.6 --top-k 20 --top-p 0.95
```

Type your question and press Enter. The model responds in 4–5 seconds, then waits for the next message. Type `/bye` to exit.

### Option B — Full Sensai gateway

First confirm `llama-server` is running:

```bash
ps aux | grep llama-server
```

If not running, start it:

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2 &
```

Then build and run the gateway:

```bash
make build
cp .env.example .env   # first time only
./build/picoclaw agent
```

The gateway starts and listens on all configured channels (web UI at port 3000, Telegram, or terminal).

---

## Repository Layout

```
Sensai/
├── cmd/picoclaw/       # CLI entry point (Cobra)
├── pkg/                # agent, channels, providers, tools, skills, memory…
├── yzma/               # submodule → hybridgroup/yzma (llama.cpp FFI)
├── docs/Sensai/        # whitepapers, benchmarks
├── Makefile
└── .env.example
```

---

## Docs (`docs/Sensai/`)

| Document | Description |
|---|---|
| `picoclaw_yzma_whitepaper.md` | Initial deep-dive: PicoClaw + Yzma integration design |
| `picoclaw_yzma_whitepaper_v2.md` | Revised architecture + operational analysis (PicoClaw + Yzma) |
| `picoclaw_yzma_final_eval_v3.md` | Production evaluation — live server + gateway log analysis |
| `picoclaw_summary_v4.md` | Final benchmark results + optimization guide (v4 results) |
| `Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md` | Adreno 702 OpenCL backend setup for TTFT reduction |
| `Decode_Throughput_Optimization_Whitepaper_Yzma_Qwen3_Arduino_Uno_Q.md` | Maximizing decode tok/s on LPDDR4X bandwidth ceiling |
| `Ventuno_Q_GPU_Enhanced_Prefill_Decode_Whitepaper_Yzma_Qwen3.md` | Ventuno Q inference with Adreno 623 + Hexagon NPU |
| `llama_dash.py` | Terminal streaming dashboard for llama-server eval |
| `hackster_article.md` | Hackster.io article — standalone inference and education use case |
| `testing` | Platform test notes — Qwen + yzma on Uno Q |

---

## Upstream & Submodule

```bash
# Sync with upstream picoclaw
git fetch upstream
git merge upstream/main

# Update yzma submodule to latest
git submodule update --remote yzma
git add yzma && git commit -m "chore: update yzma submodule"
```

---

## License

picoclaw: MIT · yzma: Apache-2.0
