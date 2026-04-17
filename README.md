# Sensai

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
| **Docs** | Engineering whitepapers, benchmarks, and GTM roadmap in `docs/Sensai/` |

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

You do not need the picoclaw agent layer to run LLM inference on the Uno Q. The full inference stack — yzma + llama-server — operates independently as an OpenAI-compatible HTTP API that any script, app, or curl command can talk to directly. This is the simplest path for experimentation, classroom demos, and integrating inference into your own code.

### 1. Start llama-server

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2
```

That is the entire server. It exposes an OpenAI-compatible REST API at `http://127.0.0.1:8080/v1`.

### 2. Query it directly

**curl:**
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

## Repository Layout

```
Sensai/
├── cmd/picoclaw/       # CLI entry point (Cobra)
├── pkg/                # agent, channels, providers, tools, skills, memory…
├── yzma/               # submodule → hybridgroup/yzma (llama.cpp FFI)
├── docs/Sensai/        # whitepapers, benchmarks, business plan, GTM roadmap
│   └── AITown/         # AI Town on Arduino Uno Q guide
├── Makefile
└── .env.example
```

---

## Docs (`docs/Sensai/`)

| Document | Description |
|---|---|
| `picoclaw_yzma_whitepaper.docx` | Initial deep-dive: PicoClaw + Yzma integration design |
| `picoclaw_yzma_whitepaper_v2.docx` | Revised architecture + operational analysis (PicoClaw + Yzma) |
| `picoclaw_yzma_final_eval_v3.docx` | Production evaluation — live server + gateway log analysis |
| `picoclaw_summary_v4.docx` | Final benchmark results + optimization guide (v4 results) |
| `yzma_inprocess_whitepaper.docx` | Migration path: HTTP llama-server → in-process Yzma FFI |
| `Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.docx` | Adreno 702 OpenCL backend setup for TTFT reduction |
| `Decode_Throughput_Optimization_Whitepaper_Yzma_Qwen3_Arduino_Uno_Q.docx` | Maximizing decode tok/s on LPDDR4X bandwidth ceiling |
| `Ventuno_Q_GPU_Enhanced_Prefill_Decode_Whitepaper_Yzma_Qwen3.docx` | Ventuno Q inference with Adreno 623 + Hexagon NPU |
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
