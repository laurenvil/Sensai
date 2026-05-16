# Gemini Project Instructions

## Project Overview

**Sensai Arduino Lab** is a GitHub-based curriculum that teaches middle and high school students (ages 10–16) how to build circuits, write Arduino code, and create IoT projects — guided by Sensai, an on-device AI tutor running on the Arduino Uno Q. Students progress through 10 hands-on modules — from blinking an LED to building a smart plant watering system — entirely on their own hardware.

## Repository Structure

```
curriculum/
├── README.md                              ← Public landing page (badges, objectives, module links)
├── LICENSE                                ← MIT
├── .gitignore
├── docs/
│   ├── hardware-recommendations.md        ← Boards, kits, sensor shopping list
│   ├── sensai-integration-guide.md        ← Teacher guide: Sensai in the classroom
│   ├── standards-alignment.md             ← CSTA & NGSS mapping
│   └── arduino-glossary.md                ← Student-friendly glossary
├── modules/
│   ├── 01-welcome-to-arduino/             ← Microcontroller anatomy, first sketch
│   ├── 02-your-first-circuit/             ← Breadboard, LEDs, blink
│   ├── 03-variables-and-logic/            ← Buttons, if/else, state
│   ├── 04-reading-the-world/              ← analogRead, potentiometers, map()
│   ├── 05-sensing-the-environment/        ← DHT11, light sensors, libraries
│   ├── 06-talking-to-the-computer/        ← Serial monitor, data logging
│   ├── 07-making-things-move/             ← PWM, servos, buzzers, millis()
│   ├── 08-advanced-communication/         ← I2C, OLED displays, SPI
│   ├── 09-iot-projects/                   ← Smart plant, weather station, Bridge API
│   └── 10-demo-day/                       ← 🎓 Capstone: build + present + pitch
└── assets/
    └── architecture-diagram.md            ← Mermaid diagrams
```

### Module Layout Convention

Each module follows this pattern:

```
modules/NN-module-name/
├── README.md          ← Lesson content (renders on GitHub)
└── code/              ← Working Arduino sketches (.ino) and optional data files
    ├── sketch.ino
    └── wiring_diagrams.md (optional)
```

## Audience & Tone

- **Target audience:** Middle and high school students (ages 10–16) with no prior coding or electronics experience
- **Tone:** Encouraging, patient, and curious — channel the spirit of a Sensei who respects every student's effort
- **Every technical term** must be defined on first use (e.g., "microcontroller", "GPIO", "PWM", "I2C")
- **Use analogies** to make concepts stick (e.g., "`delay()` is like putting the board to sleep — it can't hear the button while it sleeps")
- Use emoji sparingly for section headers and checkpoints (🛠️ 🔌 📡 ⚙️ 🌐 ✅ 🤖)
- **Never** use "just", "simply", or "obviously" — these shut down curiosity

## Writing Conventions

### Module READMEs

Each module README should include these sections in order:

1. **Title + one-line goal** — What the student will accomplish
2. **🔌 The Real-World Connection** — How this concept appears in real products and IoT devices
3. **Key Concepts** — Brief explanations of new terms and ideas
4. **Step-by-step instructions** — Numbered, with wiring diagrams and code
5. **🤖 Ask Sensai** — Suggested prompts students can try with Sensai
6. **🧪 Exercises / Challenges** — Hands-on tasks with expandable `<details>` hints
7. **✅ Checkpoint** — Checkbox list of what students should verify before moving on
8. **Navigation links** — Previous / Next module links

### Code Style

- All Arduino sketches must be **fully commented** explaining every concept
- Use `// 💡` comment prefix for key learning moments
- Use `// ⚠️` comment prefix for common mistakes or Uno Q-specific warnings
- Default Serial baud rate: `9600`
- Always include `void setup()` and `void loop()` — even in examples
- Prefer `const int PIN_NAME = X;` over magic numbers
- Note Uno Q differences from classic Uno (3.3V ADC, pin mappings) wherever relevant

### Sensai Integration

- Every module must include at least one `🤖 Ask Sensai` box
- Use directive prompts: "Use the arduino tool to upload a sketch that..."
- For debugging exercises, suggest: "Ask Sensai: my LED on pin 7 won't turn on, here is my code..."
- Reference Sensai's compile/upload capability in the Agentic mode

### Markdown

- Use **GitHub Flavored Markdown** — tables, task lists, alerts, fenced code blocks
- Use Mermaid diagrams for architecture/flow visualizations
- Use `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` alerts for callouts
- Code blocks use `cpp` language tag for Arduino sketches
- Keep lines and bullet points concise for readability on mobile

## Key Technical Details

### Hardware Stack

| Component | Details |
|-----------|---------|
| Primary board | Arduino Uno Q (QRB2210 MPU + STM32U585 MCU) |
| Compatible boards | Arduino Uno R4 WiFi, Uno R3 (with noted differences) |
| Logic voltage | 3.3V (Uno Q MCU headers) — NOT 5V tolerant on ADC |
| ADC range | 0–3.3V mapped to 0–1023 |
| PWM pins | D3, D5, D6, D9, D10, D11 |
| I2C buses | I2C2 (D20/D21), I2C3 (A4/A5), I2C4 (Qwiic) |
| SPI | D10–D13 or JSPI header |
| AI tutor | Sensai (on-device, Qwen3 model via llama-server) |

### Core Concepts Taught

1. **Circuits** — Current, voltage, resistance, breadboards, Ohm's law
2. **Digital I/O** — `pinMode()`, `digitalWrite()`, `digitalRead()`
3. **Analog I/O** — `analogRead()`, `analogWrite()` (PWM), `map()`
4. **Variables & Logic** — Data types, `if/else`, `for` loops, state machines
5. **Libraries** — Installing and using Arduino libraries (DHT, Servo, Wire, SPI)
6. **Serial Communication** — `Serial.print()`, Serial Monitor, data logging
7. **Sensors** — Temperature, humidity, light, soil moisture
8. **Actuators** — LEDs, servos, buzzers, relays
9. **Communication Protocols** — I2C, SPI, UART
10. **IoT Concepts** — Bridge API, data dashboards, smart automation
11. **AI-Assisted Coding** — Using Sensai to write, compile, debug, and upload sketches

## Do's and Don'ts

### Do

- Frame every lesson around building something tangible
- Include working `.ino` sketches that compile and run immediately
- Provide ASCII wiring diagrams or clear pin connection tables
- Keep Modules 1–9 completable in 1–2 class periods (45–60 minutes each)
- Module 10 (Demo Day) is a multi-session capstone — no time constraints
- Always note when Uno Q behavior differs from classic Arduino Uno
- Celebrate student achievements — "You just deployed code by asking a question!"

### Don't

- Assume students have prior coding or electronics experience
- Use unexplained jargon — define every term with an analogy
- Skip the `🤖 Ask Sensai` section — it's core to the curriculum
- Provide code without comments
- Use 5V signals on Uno Q analog pins (3.3V only!)
- Make modules dependent on internet connectivity — everything runs offline
