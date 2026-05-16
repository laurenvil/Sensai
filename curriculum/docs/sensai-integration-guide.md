# Sensai Integration Guide — For Teachers

This guide explains how to use Sensai, the on-device AI tutor, alongside each module in the Arduino curriculum.

---

## What Is Sensai?

Sensai is an AI assistant that runs **directly on the Arduino Uno Q board**. It uses a small language model (Qwen3) running on the board's Linux processor (QRB2210) to answer student questions, write Arduino code, compile sketches, and upload them to the board — all without an internet connection.

Think of Sensai as a patient, always-available teaching assistant who never gets tired, never judges, and always meets students where they are.

---

## Two Modes of Operation

### 🤖 Agentic Mode (`make sensai`)

This is the **full** mode. Sensai can:
- ✅ Answer questions about Arduino and electronics
- ✅ Write complete Arduino sketches
- ✅ **Compile sketches** using `arduino-cli`
- ✅ **Upload sketches** to the board over the hardware debug interface
- ✅ Debug code and explain error messages
- ✅ Maintain conversation history

**Best for:** Hands-on modules where students want to write code, test ideas, and see results on the physical board.

**How to start:**
```bash
make sensai
```

### 📝 Direct Mode (`make sensai-direct`)

This is a **lightweight, text-only** mode. Sensai can:
- ✅ Answer questions about Arduino and electronics
- ✅ Write Arduino sketches (as text in chat)
- ✅ Explain hardware concepts and pin mappings
- ❌ Cannot compile or upload sketches

**Best for:** Concept-focused discussions, Q&A sessions, or when you want faster response times without tool overhead.

**How to start:**
```bash
make sensai-direct
```

---

## Module-by-Module Integration

### Phase 1: Foundations (Modules 1–3)

| Module | Sensai Role | Suggested Activities |
|--------|-------------|---------------------|
| **01 — Welcome to Arduino** | Concept explainer | Ask Sensai: "What is the difference between the MPU and MCU on the Uno Q?" |
| **02 — Your First Circuit** | Code writer + uploader | Ask Sensai: "Use the arduino tool to upload a blink sketch for pin 13 with 500 ms toggles." |
| **03 — Variables & Logic** | Debugger | Give Sensai broken button code and ask it to find the bug |

> [!TIP]
> **Module 2 is the "wow" moment.** When students see Sensai compile and upload a blink sketch just by asking, they understand AI-assisted development in a visceral way.

### Phase 2: Sensing (Modules 4–6)

| Module | Sensai Role | Suggested Activities |
|--------|-------------|---------------------|
| **04 — Reading the World** | Concept explainer | "Why does the Uno Q read 0–1023 when the max voltage is 3.3V?" |
| **05 — Sensing the Environment** | Library assistant | "Use the arduino tool to upload a sketch that reads the DHT11 on pin 2 and prints temperature." |
| **06 — Talking to the Computer** | Code formatter | "Help me format my sensor output as CSV so I can paste it into a spreadsheet." |

### Phase 3: Actuators & Protocols (Modules 7–8)

| Module | Sensai Role | Suggested Activities |
|--------|-------------|---------------------|
| **07 — Making Things Move** | Code writer | "Use the arduino tool to upload a sketch that sweeps a servo from 0 to 180 degrees." |
| **08 — Advanced Communication** | Protocol explainer | "What I2C address does the SSD1306 OLED use?" + "Upload a sketch that shows 'Hello' on my OLED." |

### Phase 4: IoT Capstone (Modules 9–10)

| Module | Sensai Role | Suggested Activities |
|--------|-------------|---------------------|
| **09 — IoT Projects** | Project architect | "Help me design a smart plant watering system using a soil moisture sensor and relay." |
| **10 — Demo Day** | Live coding assistant | Students use Sensai during their presentation to modify code live |

---

## Classroom Strategies

### The "Ask-First" Pattern

Before students start typing code, encourage them to:
1. **Describe** what they want to build in plain English
2. **Ask Sensai** to write the first version
3. **Read** the code Sensai produces and identify 3 things they understand
4. **Modify** one thing (change a pin number, a delay time, a threshold)
5. **Ask Sensai** to compile and upload the modified version

This follows the IBL (Inquiry-Based Learning) cycle: Engage → Explore → Explain → Elaborate → Evaluate.

### The "Debug Challenge"

Give students intentionally broken code and have them:
1. Try to find the bug themselves (2–3 minutes)
2. Ask Sensai for help if stuck
3. Compare Sensai's explanation with their own guess

### The "What If?" Extension

After every working sketch, Sensai will often close with a "what if" question (e.g., "Try changing 500 to 100 — what do you predict will happen?"). Encourage students to actually try it.

### Managing Sensai in a Classroom

| Concern | Solution |
|---------|----------|
| "Students will just ask Sensai for everything" | That's okay initially — reading AI code is a valid learning strategy. The exercises progressively require modification and original thinking. |
| "Sensai is too slow" | On the Uno Q with the 0.8B model, responses take ~10–30 seconds. Use this time for students to predict what Sensai will say. |
| "Sensai gives wrong code" | Treat it as a learning moment! "Even AI makes mistakes — can you find the bug?" |
| "Only one student can use Sensai at a time" | Each Uno Q runs its own Sensai. For shared setups, use a queue or pair programming. |

---

## Prompt Engineering for Students

Teach students that **how they ask** affects the quality of Sensai's response:

| Prompt Quality | Example | Result |
|----------------|---------|--------|
| ❌ Vague | "Make something with LEDs" | Sensai may produce code that doesn't match intent |
| ⚠️ Okay | "Blink an LED on pin 7" | Sensai writes code but may not upload |
| ✅ Great | "Use the arduino tool to upload a sketch that blinks an LED on pin 7 every 250 ms" | Sensai writes, compiles, and uploads — student sees result immediately |

> [!IMPORTANT]
> **Directive prompts** (ones that name the `arduino` tool) have near-100% reliability for triggering compile/upload behavior. Teach students this pattern early.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sensai not responding | Run `make sensai-stop` then `make sensai` to restart |
| Compilation errors | Ask Sensai to read the error and try again — it self-corrects |
| Upload fails | Run: "Use the arduino tool to detect connected boards" to check the port |
| Slow responses | Normal for the 0.8B model. Consider switching to Direct mode for Q&A-heavy sessions |
