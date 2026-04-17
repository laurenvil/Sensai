# Sensai: Teaching Kids to Code With AI That Lives on the Board — No Cloud Required

*How a small language model running entirely on an Arduino Uno Q is quietly dismantling one of the biggest walls in maker education.*

---

## The Problem Nobody Talks About

Walk into any middle school coding club and you will find the same scene: a student stares at a blank Arduino sketch, a blinking cursor, and an error message that means nothing to them. The teacher is across the room helping someone else. The student closes the laptop.

That moment — the moment before curiosity turns into frustration and frustration turns into "coding is not for me" — is where most young makers are lost. Not because they lack the ability, but because the feedback loop between *idea* and *working hardware* is too long, too cryptic, and too dependent on knowing the right syntax before you can express the right thought.

I built Sensai to attack that gap directly. Not with a dumbed-down coding environment or a drag-and-drop block editor, but with a full AI agent running *on the board itself* — no internet connection, no API subscription, no cloud latency, no data leaving the room.

---

## What Sensai Actually Is

Sensai is an ultra-lightweight AI agent gateway written in Go, built specifically for the Arduino Uno Q — Qualcomm's QRB2210-powered embedded Linux board with 4 GB of LPDDR4X RAM and an Adreno 702 GPU with OpenCL 2.0 support. It is a production fork of the open-source picoclaw agent framework, stripped down and tuned for on-device inference on constrained hardware.

The key ingredient is **yzma**, a Go binding for llama.cpp that uses FFI instead of CGo, meaning the entire inference stack compiles cleanly for ARM64 Debian Linux without any exotic toolchain. Combined with a quantized small language model — I settled on Qwen3.5-0.8B at Q6_K, sitting at around 700 MB on disk — the Uno Q can hold a full conversation, understand hardware context, and generate working Arduino sketches entirely offline.

No Claude. No GPT-4. No Gemini. No API key. No monthly bill. Just a $80 board and a model file.

---

## Why Small Language Models Change the Equation for Education

The prevailing assumption in ed-tech AI has been that useful AI requires cloud compute. That assumption has a hidden cost that rarely gets discussed: it excludes.

Schools in rural areas often have unreliable internet. Maker spaces in underfunded districts cannot afford per-token API costs at classroom scale. Privacy-conscious institutions — which is increasingly all of them — cannot send student interactions to third-party servers. And perhaps most importantly: when a student's AI assistant goes down because of an API outage or a rate limit, the lesson stops.

Local edge inference eliminates all of these failure modes at once. The model is there. It runs. Every time.

What surprised me most during development was how capable a sub-1B parameter model could be when given the right context. I feed Sensai a system prompt that includes the board's pinout, the available libraries, and the student's current sketch. Within that narrow domain — "help me make this LED blink in a pattern" or "why is my servo jittering" — Qwen3.5-0.8B performs remarkably well. It does not need to know how to write a novel or solve differential equations. It needs to know the Arduino API and how to explain `analogWrite` to a twelve-year-old.

That is a solvable problem for a small model.

---

## The Benchmarks That Made This Possible

I will be honest: when I first started testing inference on the Uno Q, the numbers were disheartening. Version 1 of the stack hit 671 seconds end-to-end for a simple response. Unusable.

Getting from there to the current production configuration took four major iterations:

- Switching from API-based inference to local llama.cpp via yzma
- Tuning context window size (12,288 tokens) and parallel slots (2) for the QRB2210's memory bandwidth ceiling
- Selecting Qwen3-0.6B at Q4_0 for bandwidth-constrained scenarios (~340 MB, ~10 tok/s decode ceiling)
- Pinning the llama-server process and eliminating swap dependency

The v4 final numbers: **4.50 seconds end-to-end, 4.43 tok/s generation, 2.25 seconds TTFT, zero swap usage.** A 149× improvement over the baseline. That is the difference between a tool that feels broken and one that feels alive.

For a student asking a question and waiting for an answer, 4.5 seconds is fast enough to feel responsive. The conversation flows.

---

## What the Student Experience Looks Like

The interaction model is intentionally simple. A student types a question or describes what they want their project to do. Sensai responds in plain language, explains what it is doing, and either generates a sketch directly or walks the student through the logic step by step.

A typical session might look like this:

> **Student:** I want my LED to fade in and out slowly, like breathing.
>
> **Sensai:** That is called a breathing effect. You can do it with `analogWrite` on a PWM-capable pin — pin 9 on your Uno works well. Here is a sketch that fades the LED up and then back down in a loop...

No compiler error to decode. No Stack Overflow rabbit hole. No waiting for a teacher to be free. Just an answer, on the board, right now.

When the student modifies the sketch and something breaks, Sensai reads the error output and explains what went wrong in terms the student can act on. The feedback loop that used to take twenty minutes collapses to seconds.

---

## Why "No Cloud" Is a Feature, Not a Limitation

There is a pattern in maker education tools where AI assistance is positioned as a bonus feature — something you unlock by paying for a subscription or signing up for an API account. That framing treats AI as a luxury add-on rather than a fundamental part of the learning environment.

Sensai inverts that. Because the model runs on the board, it is always there. It works in a basement workshop with no Wi-Fi. It works at a robotics competition where internet access is locked down. It works in a school that cannot sign data processing agreements with third-party AI vendors.

This also matters for the students themselves. There is something meaningfully different about an AI that runs *on your hardware* versus one that runs on someone else's servers. It is yours. You can inspect it, replace the model, modify the system prompt, or turn it off entirely. It is not a service you are dependent on — it is a tool you own.

That is the kind of relationship with technology we should be teaching young people to have.

---

## The Compliance Wall That Blocks Most AI Tools in Schools

Here is something that does not get enough coverage in the maker community: even when a school *wants* to adopt an AI tool, the legal process to approve it can take months — or kill the initiative entirely.

Cloud-based AI assistants require schools to enter into data processing agreements (DPAs) with the provider before a single student can use them. Those agreements must be reviewed by district legal counsel, approved by IT security, and often ratified by the school board. For a well-resourced district with a dedicated privacy team, this might take six to eight weeks. For a smaller district, it may never happen at all.

Sensai sidesteps this entirely because there is no data processor. Student interactions never leave the board. There is nothing to agree to, no vendor to vet, and no student data at risk. This directly addresses the compliance frameworks that govern how schools can use technology with minors:

**COPPA (Children's Online Privacy Protection Act)** requires verifiable parental consent before collecting personal information from children under 13 online. A local model that never transmits data has no collection to consent to. The requirement dissolves.

**FERPA (Family Educational Rights and Privacy Act)** restricts disclosure of student education records to third parties without consent. When an AI assistant processes a student's questions locally on a board in the classroom, there is no disclosure — the data never leaves the school's physical custody.

**GDPR Article 8 and the EU AI Act** impose strict conditions on processing children's personal data and on AI systems deployed in educational settings. On-device inference with no external data flow falls outside the scope of most GDPR data processing obligations entirely. EU schools face some of the most restrictive AI adoption barriers in the world; local inference offers a compliant path where cloud tools cannot go.

**State-level student privacy laws** — including SOPIPA (California), New York's Education Law 2-d, and similar statutes now enacted in over 40 US states — broadly prohibit ed-tech vendors from using student data for commercial purposes. A model running on a $80 board has no vendor relationship, no user data pipeline, and no commercial incentive to exploit.

**CIPA (Children's Internet Protection Act)** requires schools receiving E-rate funding to implement internet safety policies and filtering. An AI tool that operates entirely offline requires no internet connection and therefore raises no CIPA compliance questions at all.

The practical effect is significant. A teacher can bring a Sensai-equipped Uno Q into a classroom tomorrow without filing a single form. A district maker space can deploy a set of boards without a legal review cycle. A student at home can use the same tool on their own hardware with no account, no login, and no data collection of any kind.

For administrators who have watched promising ed-tech tools stall in procurement for years, this is not a minor convenience. It is the difference between adoption and abandonment.

---

## You Do Not Need the Gateway

One thing I want to be explicit about: **you do not need Sensai — or any agent framework — to run LLM inference on the Uno Q.** The inference stack beneath it is completely self-contained, and for many use cases it is the better choice.

yzma ships a pre-built `llama-server` binary for ARM64. You download it, point it at a model file, and you have a fully functional OpenAI-compatible inference server running locally on the board. No Go. No agent config. No channels or routing. Just this:

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2
```

From that point on, any code that can speak HTTP can use it:

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen","messages":[{"role":"user","content":"What does analogWrite do?"}],"max_tokens":256}'
```

For a classroom setting, this is often the right starting point. A student can write a ten-line Python script that asks the board a question and gets an answer back. They own every line of code. There is no black box, no framework to learn, no middleware to debug. The model is a local service they can query from a shell. That kind of transparency is genuinely educational in a way that a pre-built chatbot interface is not.

The gateway layer — Sensai — is useful when you want persistent conversation history, tool use, Telegram integration, or a web UI out of the box. But it is an optional layer on top, not a requirement. The Uno Q can run useful AI inference with nothing more than a model file and the llama-server binary.

This distinction matters for adoption. A teacher who wants to show students a "hello world" AI demo does not need to configure a Go agent. They need llama-server running and one curl command. That is a five-minute setup, not an afternoon.

---

## The Stack, for the Technically Curious

For makers who want to dig in or adapt this for their own boards:

| Component | Details |
|---|---|
| **Board** | Arduino Uno Q (Qualcomm QRB2210, 4× Cortex-A53 @ 2.0 GHz) |
| **OS** | Debian Linux, kernel 6.16 |
| **Inference engine** | llama.cpp via yzma (Go FFI, no CGo) |
| **Primary model** | Qwen3.5-0.8B-Q6_K (~700 MB) |
| **Bandwidth model** | Qwen3-0.6B-Q4_0 (~340 MB, ~10 tok/s) |
| **Agent framework** | Sensai (Go, fork of picoclaw) — optional |
| **Context window** | 12,288 tokens |
| **Inference config** | `--parallel 2`, no swap, host-only bind |

The llama-server process can be configured to start on boot via systemd and stay resident. Sensai optionally connects to it over localhost and adds the agent logic — tool calling, context management, conversation history, and channel routing (terminal, web UI, or Telegram for remote sessions).

The full source is available on GitHub. The yzma submodule includes pre-built llama.cpp shared libraries for ARM64, so setup on a fresh Uno Q is a model download and a single command away — with or without the gateway.

---

## What Comes Next

The Ventuno Q — Arduino's upcoming IQ-8275 board with a 40 TOPS Hexagon NPU — changes the ceiling considerably. At that level of on-device compute, models in the 3B–7B range become viable at real-time speeds. The gap between what a local model can do and what a cloud model can do narrows significantly.

But I am not waiting for that. The 0.8B model running today, on the board that exists today, is already good enough to help a student who would otherwise give up. That is the benchmark that matters most to me.

The coding barrier is real. The tools to lower it are here. They fit on a board you can hold in your hand.

---

*Sensai is open source and available on GitHub. It runs on any ARM64 Debian Linux board with sufficient RAM — the Arduino Uno Q is the primary target, but it has been tested on similar Qualcomm Dragonwing hardware. Contributions and ports welcome.*
