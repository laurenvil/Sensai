# 💡 Module 02 — Your First Circuit

> **Estimated Time:** 1–2 class periods  
> **AutoGrader:** Enabled

## 🎯 Learning Objectives

1. Build a working LED circuit on a breadboard
2. Understand resistors and why LEDs need them (Ohm's law)
3. Write a blink sketch using `pinMode()`, `digitalWrite()`, and `delay()`
4. Create a traffic light sequence with 3 LEDs

## 🛤️ Choose Your Path

### Path A — Guided 📖
1. Wire an LED + 220Ω resistor from pin 13 to GND
2. Edit `starter-code/blink.ino` — make the LED blink at 500ms intervals
3. Push and verify the AutoGrader passes

### Path B — Explorer 🚀
- Build an SOS Morse code blinker
- Create a countdown timer with multiple LEDs
- Design your own light pattern

### Path C — Expert 🧠
- Add a new challenge sketch to this module's `starter-code/`
- Improve the wiring diagrams in the README

## 🤖 AutoGrader

| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | Create `learning-contract.md` in repo root |
| `test_sketch_has_setup_and_loop` | 50 pts | Complete `blink.ino` with proper `setup()` and `loop()` |
| `test_community_contribution` | 25 pts | Add a `.md` file to `community-resources/` |

## 🤖 Ask Sensai

- *"Use the arduino tool to upload a blink sketch for pin 13 with 500ms toggles."*
- *"What would happen if I forgot the resistor?"*
- *"What does `digitalWrite(13, HIGH)` actually do electrically?"*

---

*Open a Pull Request using the PR template when the AutoGrader shows ✅.*
