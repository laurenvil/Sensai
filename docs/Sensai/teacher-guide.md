# Sensai Teacher Guide

Sensai is an on-device Arduino AI assistant that runs entirely on the Arduino Uno Q board — no internet, no cloud subscription, no data leaving the classroom. This guide covers everything you need to deploy it, run it in a lesson, and understand what it can and cannot do.

---

## What Sensai Is

Sensai is a domain-specific AI tutor pre-loaded with deep knowledge of the Arduino Uno Q board. Students send it questions in plain English — through a terminal on the board itself, or via Telegram from any phone or laptop — and Sensai responds with working code, plain-language explanations, and a follow-up question that invites the student to experiment.

It is not a general-purpose chatbot. It stays focused on Arduino, electronics, and embedded programming. If a student asks it something unrelated, it gently redirects back to the board.

**Sensai teaches the way a Sensei would.** It validates what a student got right before correcting what went wrong. It uses analogies before technical terms. It closes every code response with a "what if" prompt that turns a handout into an experiment. It never says "just" or "simply."

---

## Hardware and Software Overview

| Component | What it is |
|---|---|
| Arduino Uno Q | The board — runs Sensai on its Linux processor (Qualcomm QRB2210, 4 GB RAM) |
| Qwen3.5-0.8B | The AI model — ~700 MB, runs entirely on-device |
| llama-server | Inference engine that serves the model via local HTTP |
| picoclaw gateway | Routes messages between Telegram and the AI |
| `picoclaw agent` | The terminal chat interface students use directly on the board |

Sensai has **two ways for students to interact:**

1. **Terminal** — connect a keyboard and monitor (or SSH) and type questions at the `You:` prompt. Sensai prints its response directly below. This is launched automatically by `make sensai`.
2. **Telegram** — send messages from any phone or laptop on the same network (or internet with port forwarding).

Both work simultaneously once Sensai is running. The terminal session looks like this:

```
  ┌───────────────────────────────────────────┐
  │  🧘  S  E  N  S  A  I                    │
  │      Arduino AI Assistant                  │
  │                                            │
  │  Type your question at 'You:' and press    │
  │  Enter. Sensai responds in a few seconds.  │
  │  Type 'exit' or Ctrl+C to quit.           │
  └───────────────────────────────────────────┘

Sensai is ready — type your question below (type 'exit' to quit)

You: blink pin D9 every 500ms

Sensai: Here is a complete sketch that blinks D9 every 500 ms...
```

---

## First-Time Setup (Do This Once)

> You will need: a computer with Git, Go 1.21+, and `make`. The final result runs entirely on the Arduino Uno Q.

### Step 1 — Clone and initialize

```bash
git clone https://github.com/laurenvil/Sensai.git ~/ArduinoApps/Sensai
cd ~/ArduinoApps/Sensai
git checkout sensai
git submodule update --init --recursive
```

### Step 2 — Download the AI inference engine

```bash
cd yzma && make download-llama.cpp && cd ..
```

This places `llama-server` in `yzma/lib/`. It is the engine that runs the AI model.

### Step 3 — Download the AI model

```bash
mkdir -p ~/models
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q6_K.gguf'
```

The model is approximately 700 MB. Download once; it does not change.

### Step 4 — Build and configure

```bash
make sensai-install
```

This single command:
1. Builds the Sensai binary
2. Installs the system prompt and identity files
3. Runs the interactive setup wizard

The wizard will:
- Confirm whether the model and inference engine are present
- Ask for an optional Telegram bot token
- Ask who is allowed to message the bot (leave blank to allow anyone on your network)

**To get a Telegram bot token:** Open Telegram, message `@BotFather`, send `/newbot`, follow the prompts. Copy the token the wizard asks for. This step is optional — Sensai works without Telegram.

### Step 5 — Launch

```bash
make sensai
```

Sensai starts, displays a welcome banner, and is ready for questions. Keep this terminal open during class.

---

## Daily Classroom Use

```bash
cd ~/ArduinoApps/Sensai
make sensai
```

That is the only command you need each session. It starts the inference engine and gateway automatically, then opens the terminal chat. Press `Ctrl+C` to stop everything cleanly.

---

## Telegram Setup for Student Devices

With a Telegram bot token configured, students can reach Sensai from their phones or laptops without connecting to the board directly. This is useful in a classroom where only one board is running Sensai for the whole group, or where students connect via the school network.

**To restrict access to specific students:**

Run `make sensai-onboard` to re-enter the setup wizard. When asked "Allow from:", enter the students' Telegram user IDs separated by commas. Students can find their own ID by messaging `@userinfobot` on Telegram.

Leave "Allow from" blank to allow anyone who knows the bot's username.

---

## Re-running Configuration

| Command | What it does |
|---|---|
| `make sensai` | Start Sensai for the session |
| `make sensai-onboard` | Re-run the setup wizard (change Telegram token, allow list) |
| `make sensai-setup` | Reinstall the system prompt after a git pull |
| `make sensai-tui` | Launch the graphical channel configuration panel |
| `make sensai-stop` | Stop background processes without closing the terminal |

---

## What Sensai Knows

Sensai has been loaded with accurate, datasheet-verified knowledge of the Arduino Uno Q:

- Complete pin reference for all headers (JDIGITAL, JANALOG, JSPI, Qwiic)
- Voltage rules — all Arduino headers are 3.3 V; A0–A5 are **not** 5 V tolerant
- The dual-processor architecture (Linux MPU + Arduino MCU) and Bridge API
- Full Arduino API: `analogRead`, `analogWrite`, `digitalRead`, `digitalWrite`, `delay`, `millis`, `Serial`, `Wire`, `SPI`, `Servo`, `tone`
- Common beginner patterns: blink, fade/breathe, button debounce, PWM motor control, servo sweep, I2C sensor reads, `millis()`-based timers
- Common mistakes and how to avoid them

---

## What Sensai Cannot Do

| Limitation | Why |
|---|---|
| Cannot compile and upload sketches autonomously | `arduino-cli` integration is planned (Phase 3) but not yet implemented |
| Responses take 5–30 seconds | The 0.8B model generates at ~4 tokens/second on the board's ARM CPU |
| Cannot answer questions outside Arduino/electronics | By design — keeps it focused for classroom use |
| No internet access | All inference is local; web tools are disabled in configuration |
| Cannot stream partial responses (Telegram) | Sends the complete response when finished |

---

## Inquiry-Based Learning Design

Sensai is not a homework machine. It is built around the principles of inquiry-based learning:

- **Validate before correcting.** When a student's code has an error, Sensai names what was correct before explaining what went wrong. Students who feel heard stay curious.
- **Close with a question.** Every code response ends with a "what if" prompt: *"Try changing 500 to 100 — what do you predict will happen?"* This turns the AI response into a starting point for an experiment, not an ending point.
- **Use analogies.** `delay()` is explained as "putting the board to sleep — it cannot hear the button while it sleeps." Technical terms come after the concept, not before.
- **Never shame.** Sensai is explicitly instructed to never say "just," "simply," or "obviously." These words signal that the student should already know something. They do not.
- **Give the answer when stuck.** Inquiry-based learning is not gate-keeping. If a student is frustrated and has already tried, Sensai delivers the working solution — then invites reflection.

**Suggested classroom flow:**

1. Student wires a circuit and attempts to write a sketch
2. Student encounters an error or unexpected behavior
3. Student asks Sensai in their own words
4. Sensai diagnoses, delivers working code, names what was right in the student's attempt, closes with a "what if"
5. Student modifies the experiment based on the prompt
6. Repeat

---

## Classroom Deployment Notes

**One board, many students (local network):**
Run Sensai on one Uno Q board. Enable Telegram. All students message the bot from their own devices. llama-server handles up to 2 parallel requests (configured); a third student will queue for ~5 seconds.

**One board per student:**
Each board runs its own instance of Sensai independently. No shared infrastructure needed.

**No internet in the classroom:**
Sensai works completely offline. All inference, all responses, all data stays on the board. Only Telegram requires internet (if enabled).

**Expected response times (Qwen3.5-0.8B on Uno Q):**

| Response length | Approximate time |
|---|---|
| Short answer (50 words) | 5–10 seconds |
| Code snippet + explanation (100 words) | 15–25 seconds |
| Full sketch with explanation (200 words) | 35–50 seconds |

Set student expectations: *"Sensai is thinking on the board — give it a moment."*

---

## Updating Sensai

```bash
git pull origin sensai
make sensai-setup   # reinstall the system prompt
make build          # rebuild the binary
```

Run `make sensai` to restart.

---

## Troubleshooting

**"Asking Sensai..." appears on Telegram but no response arrives**

1. Check llama-server is running: `ps aux | grep llama-server`
2. Check it is healthy: `curl http://127.0.0.1:8080/v1/models`
3. Run with debug logging: `./build/picoclaw gateway --debug`
4. Confirm `request_timeout` in `~/.picoclaw/config.json` is `1200` — the default 30 s will time out during model warm-up

**Responses are very slow (> 60 seconds)**

- Confirm `/no_think` is the first line of `~/.picoclaw/workspace/SOUL.md`. Without it, Qwen3 generates reasoning tokens before every response, adding 30–120 s.
- Check RAM: `free -h`. llama-server needs ~1.3 GB free. Close other processes if swap is in use.
- Try the smaller model: `Qwen3-0.6B-Q4_0.gguf` (~340 MB, about 2× faster, slightly lower quality)

**Telegram bot does not respond at all**

- Confirm the token: `curl "https://api.telegram.org/bot<TOKEN>/getMe"`
- If `allow_from` is set, confirm your Telegram user ID is in the list
- Restart after any config change: `make sensai-stop && make sensai`

**"model not found" error on startup**

Run `make sensai-setup` — it reinstalls the config template that includes the `qwen-local` model entry.

---

## Privacy and Data

All student questions and responses are processed on the Arduino Uno Q board itself. No data is sent to any external server. No API keys are required. No accounts are needed. When Telegram is enabled, messages travel over Telegram's servers to reach the board, but the AI processing happens entirely locally.

---

## Support and Next Steps

- **Source code and issues:** `https://github.com/laurenvil/Sensai` (branch: `sensai`)
- **Architecture details:** `docs/Sensai/development/architecture-study-bible.md`
- **Setup walkthrough:** `docs/Sensai/development/sensai-setup-walkthrough.md`
- **Planned features:** Autonomous sketch compilation and upload (Phase 3), streaming responses (Phase 2), classroom multi-board orchestration (Phase 5)
