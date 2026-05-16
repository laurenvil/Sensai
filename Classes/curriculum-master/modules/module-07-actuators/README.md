# ⚙️ Module 07 — Making Things Move
> **Estimated Time:** 1–2 class periods | **AutoGrader:** Enabled

## 🎯 Learning Objectives
1. Understand PWM (Pulse Width Modulation) and `analogWrite()`
2. Control a servo motor with the `Servo.h` library
3. Play tones on a piezo buzzer with `tone()`
4. Know which pins support PWM (~D3, ~D5, ~D6, ~D9, ~D10, ~D11)

## Path A — Guided 📖
1. Wire a servo: signal→D9, power→5V, GND→GND
2. Edit `starter-code/servo_sweep.ino` — sweep 0° to 180° and back
3. Push and verify AutoGrader passes

## 🤖 AutoGrader
| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` in repo root |
| `test_sketch_structure` | 50 pts | Sketch includes `Servo.h`, `attach()`, and `write()` |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"Use the arduino tool to upload a servo sweep sketch."*
- *"What is PWM and why can't I use it on every pin?"*
