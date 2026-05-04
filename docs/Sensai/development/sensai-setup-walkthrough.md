# Sensai Setup Walkthrough

Step-by-step guide to run Sensai on an Arduino Uno Q — from a fresh board to a working AI assistant that writes, compiles, and uploads Arduino sketches.

---

## Prerequisites

| Item | Details |
|---|---|
| Board | Arduino Uno Q (QRB2210, 4 GB RAM, Debian Linux) |
| Go 1.21+ | For building the Sensai binary |
| Git | To clone the repo |
| curl or wget | For downloading the model and arduino-cli |
| Telegram bot token | Optional — from @BotFather on Telegram |

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

```bash
mkdir -p ~/models
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q6_K.gguf'
```

The model is approximately 700 MB. Download once — it does not change.

**Alternative (lower RAM / faster, slightly lower quality):**

```bash
wget -O ~/models/Qwen3-0.6B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf'
```

---

## Step 4: Install Everything

```bash
make sensai-install
```

This single command:
1. Builds the Sensai binary (`build/picoclaw`)
2. Installs the system prompt (`SOUL.md`) and identity files to `~/.picoclaw/workspace/`
3. Copies `config/sensai.config.json` to `~/.picoclaw/config.json` (first run only)
4. Downloads and installs `arduino-cli` to `~/.local/bin/` if not present
5. Installs the `arduino:zephyr` board core for the Uno Q
6. Runs the interactive setup wizard:
   - Confirms model and inference engine are present
   - Confirms `arduino-cli` and board core status
   - Asks for an optional Telegram bot token
   - Asks who can message the bot (leave blank for anyone on your network)

To re-run just the arduino-cli step later:

```bash
make sensai-arduino-setup
```

To re-run just the onboarding wizard (to change the Telegram token, for example):

```bash
make sensai-onboard
```

---

## Step 5: Launch

```bash
make sensai
```

This starts `llama-server` in the background, starts the Telegram gateway if configured, and opens the Sensai terminal chat. The welcome banner appears when the model is ready:

```
  ┌───────────────────────────────────────────┐
  │  🧘  S  E  N  S  A  I                    │
  │      Arduino AI Assistant                  │
  │                                            │
  │  Type your question at 'You:' and press    │
  │  Enter. Sensai responds in a few seconds.  │
  │  Type 'exit' or Ctrl+C to quit.           │
  └───────────────────────────────────────────┘

You: write a sketch that blinks D9 every 500ms and upload it

Sensai: Compiling and uploading...
```

Press `Ctrl+C` to stop everything cleanly.

---

## Step 6: Verify Sketch Compilation

Once Sensai is running, ask it to compile a test sketch:

```
You: compile a blink sketch for D9
```

Sensai will call `arduino-cli compile --fqbn arduino:zephyr:unoq` internally. If compilation succeeds, it reports success. If there is an error, it reads the output, explains the problem in plain English, and fixes it.

To upload to a connected board:

```
You: write a blink sketch for D9 and upload it to my board
```

To check which boards are connected:

```
You: what boards are connected?
```

---

## Quick Reference: Make Targets

| Command | What it does |
|---|---|
| `make sensai` | Start Sensai for the session |
| `make sensai-install` | Full first-time setup (build + workspace + arduino-cli + wizard) |
| `make sensai-onboard` | Re-run setup wizard (change Telegram token, allow list) |
| `make sensai-setup` | Reinstall system prompt after a git pull |
| `make sensai-arduino-setup` | Install or update arduino-cli and the Uno Q board core |
| `make sensai-stop` | Stop background llama-server and gateway |
| `make sensai-tui` | Launch the graphical channel configuration panel |

---

## Auto-start on Boot (Optional)

To run llama-server automatically on boot:

```ini
# /etc/systemd/system/llama-server.service
[Unit]
Description=llama-server inference daemon
After=network.target

[Service]
ExecStart=/home/arduino/ArduinoApps/Sensai/yzma/lib/llama-server \
  -m /home/arduino/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2
Restart=on-failure
User=arduino

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now llama-server
```

Students can then SSH in and run `make sensai` — llama-server is already warm and their session starts in seconds.

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
