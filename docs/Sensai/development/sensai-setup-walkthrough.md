# Sensai Setup Walkthrough

Step-by-step guide to run Sensai on an Arduino Uno Q — from a fresh board to a working Telegram AI assistant.

---

## Prerequisites

| Item | Details |
|---|---|
| Board | Arduino Uno Q (QRB2210, 4 GB RAM, Debian Linux) |
| Model file | `Qwen_Qwen3.5-0.8B-Q6_K.gguf` (~700 MB) placed in `~/models/` |
| yzma binaries | `yzma/lib/llama-server` and `yzma/lib/llama-cli` (see below) |
| Telegram bot | Token from @BotFather |
| Go 1.21+ | For building the gateway (not needed for standalone inference) |

---

## Step 1: Get the Repo and Submodule

```bash
git clone https://github.com/laurenvil/Sensai.git ~/ArduinoApps/Sensai
cd ~/ArduinoApps/Sensai
git checkout sensai
git submodule update --init --recursive
```

Download the llama.cpp shared libraries for ARM64:

```bash
cd yzma
make download-llama.cpp
cd ..
```

This places `llama-server` and `llama-cli` in `yzma/lib/`.

---

## Step 2: Get the Model

Download Qwen3.5-0.8B Q6_K (recommended — best quality/size tradeoff for Uno Q):

```bash
mkdir -p ~/models
# Using wget (replace URL with actual HuggingFace GGUF link):
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  "https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q6_K.gguf"
```

Alternatively, for the bandwidth-constrained scenario (e.g. 4 GB available RAM with other processes):

```bash
# Qwen3-0.6B Q4_0 — ~340 MB, ~10 tok/s decode ceiling, ~8-12s TTFT
wget -O ~/models/Qwen3-0.6B-Q4_0.gguf \
  "https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf"
```

---

## Step 3: Verify Inference Works (No Gateway Needed)

Before setting up the gateway, confirm the model runs:

```bash
./yzma/lib/llama-cli \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  -t 4 -c 4096 --mlock \
  --temp 0.6 --top-k 20 --top-p 0.95
```

Type a question and press Enter. You should see a response in 4–6 seconds. Type `/bye` to exit.

If this works, the inference stack is healthy. Proceed to Step 4.

---

## Step 4: Start llama-server

In a separate terminal (or via systemd — see Step 8), start the inference server:

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  --ctx-size 12288 \
  --parallel 2
```

Verify it is listening:

```bash
curl http://127.0.0.1:8080/v1/models
# Should return: {"object":"list","data":[{"id":"qwen",...}]}
```

---

## Step 5: Build the Sensai Gateway

```bash
cd ~/ArduinoApps/Sensai
make build
# Output: build/picoclaw-linux-arm64 (symlinked as build/picoclaw)
```

---

## Step 6: Bootstrap the Sensai Workspace

```bash
make sensai-setup
```

This installs the Sensai system prompt and identity files to `~/.picoclaw/workspace/`, and creates `~/.picoclaw/config.json` from the Sensai config template.

---

## Step 7: Configure Your Telegram Bot

Edit `~/.picoclaw/config.json` and set your bot token:

```json
"telegram": {
  "enabled": true,
  "token": "123456:ABC-your-actual-token-here",
  "allow_from": []
}
```

`allow_from` is an optional list of Telegram user IDs that can talk to the bot. Leave it empty (`[]`) to allow anyone, or add your numeric Telegram ID to restrict access:

```json
"allow_from": ["123456789"]
```

To find your Telegram ID: message @userinfobot on Telegram.

---

## Step 8: Run Sensai

```bash
./build/picoclaw agent
```

Open Telegram and message your bot. You should see "Asking Sensai..." appear immediately, followed by the response in a few seconds.

### Test prompts to verify it is working:

```
Blink the LED on pin 13 every 500ms
```
```
My servo jitters when I use delay(). How do I fix it?
```
```
What does analogRead return and what voltage does it measure?
```

---

## Step 8b: Auto-start on Boot (Optional)

### llama-server as a systemd service:

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

### Sensai gateway as a systemd service:

```ini
# /etc/systemd/system/sensai.service
[Unit]
Description=Sensai Arduino AI assistant
After=llama-server.service
Requires=llama-server.service

[Service]
ExecStart=/home/arduino/ArduinoApps/Sensai/build/picoclaw agent
WorkingDirectory=/home/arduino/ArduinoApps/Sensai
Restart=on-failure
User=arduino

[Install]
WantedBy=multi-user.target
```

Enable both:

```bash
sudo systemctl enable --now llama-server sensai
```

---

## Troubleshooting

### "Asking Sensai..." appears but no response comes

1. Check llama-server is running: `ps aux | grep llama-server`
2. Check llama-server is healthy: `curl http://127.0.0.1:8080/v1/models`
3. Check picoclaw logs for errors (run with `./build/picoclaw agent --debug`)
4. Confirm `request_timeout` in config.json is `1200` — the default 30s will time out on a cold model start

### Response is very slow (> 60s)

- Verify `/no_think` is the first line of `~/.picoclaw/workspace/SOUL.md`. Without it, Qwen3 generates reasoning tokens before every response.
- Check `ps aux` to confirm no other processes are consuming RAM — the model needs ~1.3 GB free for llama-server.
- If RAM is tight, try the Q4_0 model (~700 MB less, ~2× faster on memory-bandwidth-bound hardware).

### "model not found in model_list" error

Run `make sensai-setup` again — the config.json may not have been installed, falling back to the default which has no `qwen-local` model entry.

### Telegram bot doesn't respond at all

- Confirm `TELEGRAM_BOT_TOKEN` is correct by testing with `curl "https://api.telegram.org/bot<TOKEN>/getMe"`
- If `allow_from` is set, confirm your Telegram user ID is in the list
- Restart picoclaw after any config change

---

## Verifying Latency

Run the included monitoring script to measure llama-server throughput live:

```bash
python3 docs/Sensai/llama_dash.py
```

Target numbers for Qwen3.5-0.8B Q6_K on Uno Q (optimized config):

| Metric | Target |
|---|---|
| TTFT | < 3s |
| Generation | > 4 tok/s |
| End-to-end (80-word response) | < 25s |
| RAM used by llama-server | < 1.4 GB |
| Swap usage | 0 |

---

## Updating Sensai

```bash
git pull origin sensai
make sensai-setup   # re-installs SOUL.md and IDENTITY.md
make build          # rebuild the binary
# restart the gateway
```

To sync upstream picoclaw bug fixes without overwriting Sensai customizations:

```bash
git fetch upstream
# Cherry-pick specific commits:
git cherry-pick <commit-hash>
```
