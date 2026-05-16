# 📡 Module 04 — Reading the World

> **Estimated Time:** 1–2 class periods  
> **AutoGrader:** Enabled

## 🎯 Learning Objectives

1. Understand the difference between analog and digital signals
2. Use `analogRead()` to measure voltages from a potentiometer
3. Use the `map()` function to convert between value ranges
4. Know the Uno Q's 3.3V ADC limit (vs 5V on classic Uno)

## 🛤️ Choose Your Path

### Path A — Guided 📖
1. Wire a potentiometer: left→3.3V, middle→A0, right→GND
2. Wire an LED on pin 3 (PWM) through a 220Ω resistor
3. Edit `starter-code/pot_led.ino` — knob controls LED brightness
4. Push and verify AutoGrader passes

### Path B — Explorer 🚀
- Build a light-level meter using a photoresistor
- Create a voltage display that prints actual volts to Serial
- Design a "night light" that auto-activates in the dark

### Path C — Expert 🧠
- Add a voltage_monitor challenge sketch
- Improve the wiring instructions

## 🤖 AutoGrader

| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` in repo root |
| `test_sketch_structure` | 50 pts | Complete `pot_led.ino` with `analogRead()` and `map()` |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"Why does the Uno Q read 0–1023 when max voltage is 3.3V?"*
- *"Use the arduino tool to upload a sketch that reads A0 and prints the voltage."*

---
*Open a PR when AutoGrader shows ✅.*
