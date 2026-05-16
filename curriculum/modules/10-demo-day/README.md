# Module 10: Demo Day 🎓

> **Goal:** Design, build, and present a capstone IoT project that solves a real problem — using everything you've learned across all 9 modules.

---

## 🔌 The Real-World Connection

Every product you use — from a smart doorbell to a fitness tracker — started as someone's prototype on a breadboard. Engineers at companies like Arduino, SparkFun, and Adafruit build, test, and refine their ideas exactly the way you're about to. The difference between a "school project" and a "product" is iteration, polish, and the ability to explain why it matters.

> [!NOTE]
> **This module has no time limit.** Unlike Modules 1–9 (which fit in 1–2 class periods), Demo Day is a multi-session project. Work at your own pace, customize the features, and make it yours.

---

## The Mission

Build a complete IoT project that:

| # | Requirement | Details |
|---|------------|---------|
| 1 | **Solves a real problem** | Identify a problem in your home, school, or community |
| 2 | **Uses at least 2 sensors** | Temperature, light, moisture, buttons, potentiometers, etc. |
| 3 | **Has at least 1 actuator** | LED, servo, buzzer, relay, OLED display |
| 4 | **Includes serial output** | Data logging or status messages for debugging |
| 5 | **Is well-documented** | Comments in code, a wiring diagram, and a project description |
| 6 | **You can explain it** | Be ready for a 3–5 minute presentation |

---

## Phase 1: Choose Your Project

Pick one of the suggested projects below, or design your own!

### 🌱 Project A: Smart Greenhouse Controller

Monitor and maintain optimal growing conditions for plants.

| Feature | How |
|---------|-----|
| Read soil moisture | Capacitive moisture sensor on A0 |
| Read temperature/humidity | DHT22 on D2 |
| Read light level | Photoresistor on A1 |
| Auto-water when dry | Relay + pump on D4 |
| Display conditions | OLED showing all readings |
| Alert on extremes | LED blinks if temp > 35°C or soil too dry |

### 🔐 Project B: Room Security System

Detect intruders and alert the owner.

| Feature | How |
|---------|-----|
| Motion detection | PIR sensor on D7 |
| Door open detection | Magnetic reed switch on D8 |
| Alarm | Buzzer on D6 plays alarm tone |
| Status display | OLED shows "ARMED" / "ALERT" / "DISARMED" |
| Arm/disarm | Button on D4 with password via Serial |
| Log events | Serial CSV output with timestamps |

### 🎵 Project C: Digital Music Instrument

Build a playable instrument with visual feedback.

| Feature | How |
|---------|-----|
| Note control | Potentiometer on A0 maps to musical notes |
| Volume control | Second potentiometer on A1 |
| Sound output | Buzzer on D6 |
| Visual feedback | LEDs light up based on which note is playing |
| Display | OLED shows note name and frequency |
| Record/playback | Store a sequence and replay it |

### 🌤️ Project D: Advanced Weather Alert System

A weather station that predicts conditions and sends alerts.

| Feature | How |
|---------|-----|
| Temperature + humidity | DHT22 on D2 |
| Barometric pressure | BME280 on I2C (Qwiic or D20/D21) |
| Light level | Photoresistor on A1 |
| Trend tracking | Track rising/falling pressure over 30 minutes |
| OLED dashboard | Show current conditions + trend arrows |
| Alert LEDs | Green = clear, Yellow = changing, Red = storm warning |

### ♿ Project E: Accessibility Helper Device

Build a device that helps someone with a specific need.

| Feature | How |
|---------|-----|
| Proximity alert | Ultrasonic sensor for distance measurement |
| Haptic feedback | Buzzer intensity varies with distance |
| Visual display | OLED shows distance in large text |
| Configurable threshold | Potentiometer sets alert distance |
| Audio cues | Different tones for different distance ranges |

---

## Phase 2: Design & Plan

Before you start building, plan your project:

### Design Document (write this down!)

1. **Problem Statement** — What problem does your device solve? Who is it for?
2. **Parts List** — Every component you'll need
3. **Wiring Plan** — Which pin connects to what (use a table)
4. **Code Plan** — Pseudocode or flowchart of your logic
5. **Test Plan** — How will you know it works?

> 🤖 **Ask Sensai:** *"Help me design a [your project] — what sensors and pins should I use?"*

---

## Phase 3: Build & Code

### Starter Template

Use this template as a starting point for your project:

```cpp
// project_template.ino
// 💡 Capstone Project: [Your Project Name]
// Author: [Your Name]
// Date: [Today's Date]
// Description: [What does your project do?]

// ── Libraries ────────────────────────────────────────
// #include <DHT.h>
// #include <Servo.h>
// #include <Wire.h>
// #include <Adafruit_SSD1306.h>

// ── Pin Configuration ────────────────────────────────
// const int SENSOR_1_PIN = A0;
// const int SENSOR_2_PIN = A1;
// const int ACTUATOR_PIN = 4;
// const int LED_PIN = 13;

// ── Constants & Thresholds ───────────────────────────
// const int THRESHOLD = 500;

// ── Global Variables ─────────────────────────────────
// bool systemActive = true;

void setup() {
    Serial.begin(9600);
    Serial.println("=== [Your Project Name] ===");
    Serial.println("Initializing...");

    // TODO: Set up your pins, sensors, and displays here
    // pinMode(...);

    Serial.println("Ready!");
}

void loop() {
    // ── Step 1: SENSE — Read your sensors ────────────
    // int sensorValue = analogRead(SENSOR_1_PIN);

    // ── Step 2: PROCESS — Make decisions ─────────────
    // if (sensorValue < THRESHOLD) { ... }

    // ── Step 3: ACT — Control outputs ────────────────
    // digitalWrite(ACTUATOR_PIN, HIGH);

    // ── Step 4: DISPLAY — Show status ────────────────
    // Serial.print("Sensor: ");
    // Serial.println(sensorValue);

    delay(1000);
}
```

### Tips for Building

- **Build incrementally** — Get one sensor working before adding the next
- **Test each component alone** — Use sketches from earlier modules to verify wiring
- **Use Serial for debugging** — Print everything while developing, clean up later
- **Ask Sensai for help** — It can write, compile, and upload code modifications live

> 🤖 **Ask Sensai:** *"Use the arduino tool to upload a sketch that reads the DHT22 on pin 2 and displays temperature on the OLED."*

---

## Phase 4: Present Your Project

### The 5-Minute Pitch

Structure your Demo Day presentation like this:

| Section | Time | What to Cover |
|---------|------|--------------|
| **The Problem** | 30 sec | What problem does your device solve? Who benefits? |
| **Live Demo** | 2 min | Show it working! Trigger sensors, show outputs |
| **How It Works** | 1 min | Walk through the code and wiring (high level) |
| **Challenges** | 30 sec | What was hardest? What did you learn? |
| **What's Next** | 30 sec | How would you improve it? What would v2 look like? |
| **Q&A** | 30 sec | Answer questions from classmates |

### Presentation Tips

- **Start with the problem**, not the technology — "Has your plant ever died because you forgot to water it?"
- **Demo first, explain second** — People remember what they see
- **Show your mistakes** — "The first version flooded the plant because I forgot hysteresis"
- **Use Sensai live** — Modify code during your demo to show how Sensai helps you iterate

---

## Phase 5: Entrepreneurship Challenge (Optional)

### 💰 Cost Analysis

Calculate what your project costs to build and what a commercial version might sell for:

| Item | Your Cost | Commercial Equivalent | Commercial Price |
|------|----------|----------------------|-----------------|
| Arduino Uno Q | $60 | Smart thermostat controller | $200+ |
| DHT22 sensor | $5 | Commercial temp sensor | $30+ |
| Your labor | Free (learning!) | Engineer salary | $150/hour |

### 💡 Business Questions

1. Who would buy your device? How many potential customers exist?
2. What would you charge? How does it compare to existing products?
3. What's your "unfair advantage" — what makes your solution special?
4. How would you scale from 1 prototype to 1,000 units?

---

## 🤖 Ask Sensai

- *"Help me write a project proposal for a smart greenhouse controller."*
- *"Use the arduino tool to upload my capstone sketch."* (paste your code)
- *"Review my code and suggest improvements for reliability."*
- *"What would I need to change to make this project work with the Bridge API?"*

---

## ✅ Module 10 Checkpoint (Final!)

Congratulations! Verify you can:

- [ ] Your project uses at least 2 sensors and 1 actuator
- [ ] The code compiles and runs without errors
- [ ] Serial output provides useful debugging information
- [ ] You can explain every part of your circuit and code
- [ ] You completed a 3–5 minute presentation
- [ ] You can describe the Sense → Process → Act pattern in your project

---

## 🎉 Congratulations!

You've completed the **Sensai Arduino Lab** curriculum! Here's what you built:

| Module | What You Learned |
|--------|-----------------|
| 1 | What a microcontroller is and how the Uno Q works |
| 2 | Circuits, LEDs, resistors, and `digitalWrite()` |
| 3 | Variables, logic, buttons, and state machines |
| 4 | Analog sensors, `analogRead()`, and `map()` |
| 5 | Temperature/humidity sensors and libraries |
| 6 | Serial communication and data logging |
| 7 | PWM, servo motors, and buzzers |
| 8 | I2C, OLED displays, and communication protocols |
| 9 | Complete IoT projects with autonomous behavior |
| 10 | Capstone design, presentation, and entrepreneurship |

**You now know how to sense the world, process data, and make things happen — the foundation of every IoT device, robot, and smart system on the planet.**

And you had an AI Sensei guiding you the whole way. 🤖

---

## 🚀 What's Next?

| Direction | What to Explore |
|-----------|----------------|
| **Robotics** | Add wheels and motors — build a line-following or obstacle-avoiding robot |
| **Computer Vision** | Use the Uno Q's Linux side with OpenCV for face or object detection |
| **Machine Learning** | Train a TinyML model to recognize gestures or sounds |
| **Networking** | Use the Uno Q's Wi-Fi to send data to a cloud dashboard |
| **PCB Design** | Turn your breadboard prototype into a permanent circuit board |
| **3D Printing** | Design and print an enclosure for your project |

---

**⬅️ Previous: [Module 9 — IoT Projects](../09-iot-projects/)** | **🏠 [Back to Home](../../README.md)**
