# 🤖 Sensai Arduino Lab — Learn Arduino, Coding & IoT with an AI Sensei

> **Build real circuits, write real code, and create IoT projects — guided by Sensai, your on-device AI tutor.**

[![Arduino](https://img.shields.io/badge/platform-Arduino-00979D?logo=arduino)](https://www.arduino.cc/)
[![C++](https://img.shields.io/badge/language-C++-00599C?logo=cplusplus)](https://isocpp.org/)
[![IoT](https://img.shields.io/badge/focus-IoT-ff6f00)]()
[![Sensai](https://img.shields.io/badge/powered%20by-Sensai%20AI-8e44ad)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What Is This?

Have you ever wanted to build something that **actually does something in the real world** — blinks lights, reads temperatures, moves motors, or even waters your plants automatically?

In this curriculum, you'll learn **Arduino** — the world's most popular platform for building interactive electronics projects. You'll start by blinking an LED, progress through sensors and motors, and finish by building a complete **Internet of Things (IoT)** project you can demo, share, and be proud of.

The twist? You have an AI tutor named **Sensai** running directly on your Arduino Uno Q board. Sensai can explain concepts, write code for you, compile sketches, upload them to the board, and help you debug — all without an internet connection.

> [!NOTE]
> **No cloud account required.** Sensai runs entirely on the Uno Q hardware. Everything is local, offline, and free.

---

## 🎯 Learning Objectives

By the end of this curriculum you will be able to:

| # | Skill | What You'll Do |
|---|-------|----------------|
| 1 | **Build circuits** | Wire LEDs, buttons, sensors, and motors on a breadboard |
| 2 | **Write C++ code** | Program Arduino sketches with variables, logic, loops, and functions |
| 3 | **Read sensors** | Measure temperature, humidity, light, and soil moisture |
| 4 | **Control actuators** | Drive servo motors, LEDs with PWM, and buzzers |
| 5 | **Communicate with protocols** | Use Serial, I2C, and SPI to connect displays and sensors |
| 6 | **Build IoT projects** | Create connected, smart devices that sense and respond to the world |
| 7 | **Use AI as a tool** | Ask Sensai to write, compile, upload, and debug your code |

---

## 📚 Modules

### Phase 1: Foundations 🧱

| Module | Title | Description |
|--------|-------|-------------|
| **[Module 1](./modules/01-welcome-to-arduino/)** | Welcome to Arduino | What is a microcontroller, Uno Q anatomy, your first sketch |
| **[Module 2](./modules/02-your-first-circuit/)** | Your First Circuit | Breadboards, LEDs, resistors, and the classic blink |
| **[Module 3](./modules/03-variables-and-logic/)** | Variables & Logic | Buttons, `if/else`, and making decisions in code |

### Phase 2: Sensing 📡

| Module | Title | Description |
|--------|-------|-------------|
| **[Module 4](./modules/04-reading-the-world/)** | Reading the World | Analog signals, potentiometers, and the `map()` function |
| **[Module 5](./modules/05-sensing-the-environment/)** | Sensing the Environment | Temperature, humidity, and light sensors with libraries |
| **[Module 6](./modules/06-talking-to-the-computer/)** | Talking to the Computer | Serial communication, data logging, and serial commands |

### Phase 3: Actuators & Protocols ⚙️

| Module | Title | Description |
|--------|-------|-------------|
| **[Module 7](./modules/07-making-things-move/)** | Making Things Move | PWM, servo motors, buzzers, and non-blocking code |
| **[Module 8](./modules/08-advanced-communication/)** | Advanced Communication | I2C, OLED displays, Qwiic sensors, and SPI |

### Phase 4: IoT Capstone 🌐

| Module | Title | Description |
|--------|-------|-------------|
| **[Module 9](./modules/09-iot-projects/)** | IoT Projects | Smart plant watering, weather stations, and connected devices |
| **[Module 10](./modules/10-demo-day/)** | 🎓 Demo Day | Capstone project, presentation, and entrepreneurship |

---

## 🗂️ Repository Structure

```
curriculum/
├── README.md                              ← You are here
├── LICENSE
├── docs/
│   ├── hardware-recommendations.md        ← Boards, kits, and sensor shopping list
│   ├── sensai-integration-guide.md        ← Teacher guide: using Sensai in class
│   ├── standards-alignment.md             ← CSTA & NGSS standards mapping
│   └── arduino-glossary.md                ← Student-friendly glossary
├── modules/
│   ├── 01-welcome-to-arduino/
│   │   ├── README.md
│   │   └── code/hello_serial.ino
│   ├── 02-your-first-circuit/
│   │   ├── README.md
│   │   └── code/ (blink.ino, traffic_light.ino)
│   ├── 03-variables-and-logic/
│   │   ├── README.md
│   │   └── code/ (button_led.ino, toggle_button.ino, reaction_timer.ino)
│   ├── 04-reading-the-world/
│   │   ├── README.md
│   │   └── code/ (pot_led.ino, light_sensor.ino)
│   ├── 05-sensing-the-environment/
│   │   ├── README.md
│   │   └── code/ (temp_humidity.ino, heat_alert.ino)
│   ├── 06-talking-to-the-computer/
│   │   ├── README.md
│   │   └── code/ (serial_echo.ino, csv_logger.ino, serial_commands.ino)
│   ├── 07-making-things-move/
│   │   ├── README.md
│   │   └── code/ (led_fade.ino, servo_sweep.ino, pot_servo.ino, melody_player.ino)
│   ├── 08-advanced-communication/
│   │   ├── README.md
│   │   └── code/ (i2c_scanner.ino, oled_hello.ino, oled_sensor.ino)
│   ├── 09-iot-projects/
│   │   ├── README.md
│   │   └── code/ (smart_plant.ino, weather_station.ino, smart_light.ino)
│   └── 10-demo-day/
│       ├── README.md
│       ├── code/project_template.ino
│       └── projects/ (5 capstone project briefs)
└── assets/
    └── architecture-diagram.md            ← Mermaid diagrams
```

---

## 🚀 Quick Start

```bash
# 1. Start Sensai (on the Uno Q)
make sensai

# 2. Ask Sensai to upload your first sketch
> Use the arduino tool to upload a blink sketch for pin 13 with 500 ms toggles.

# 3. Watch the LED blink! 🎉
# Then open Module 1 to start learning.
```

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Board** | Arduino Uno Q (recommended) or Arduino Uno R4 / R3 |
| **Kit** | Breadboard, jumper wires, LEDs, resistors (220Ω, 10kΩ), push buttons |
| **Sensors** | Potentiometer, photoresistor, DHT11 or DHT22 temperature/humidity sensor |
| **Actuators** | Servo motor (SG90), piezo buzzer |
| **Display** | SSD1306 OLED display (I2C, 0.96") — for Module 8+ |
| **Software** | Arduino IDE 2.x or `arduino-cli` (pre-installed on Uno Q with Sensai) |
| **Sensai** | Pre-installed on Uno Q — or see the [Sensai setup guide](../docs/Sensai/) |

> [!TIP]
> **Don't have all the parts?** Modules 1–3 only need an LED, a resistor, a button, and jumper wires. You can start with just those and add sensors later.

---

## 🤖 Meet Sensai — Your AI Tutor

Sensai is an AI assistant that runs **directly on the Uno Q board**. It understands Arduino code, the Uno Q's hardware, and how to teach — using inquiry-based learning that meets you where you are.

**What Sensai can do:**
- ✅ Write complete, working Arduino sketches
- ✅ Compile and upload code to the board
- ✅ Explain concepts with analogies (no jargon)
- ✅ Debug your code and explain what went wrong
- ✅ Answer hardware questions (pin numbers, voltages, protocols)

**How to use Sensai in each module:**
- Look for the 🤖 **Ask Sensai** boxes in each lesson
- These suggest specific prompts you can try
- Sensai works best with directive prompts: *"Use the arduino tool to upload a sketch that..."*

> Read the full guide in [`docs/sensai-integration-guide.md`](./docs/sensai-integration-guide.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Found a typo? Have an idea for a new project? Open an issue or submit a pull request!
