# 🔗 Module 08 — Advanced Communication
> **Estimated Time:** 1–2 class periods | **AutoGrader:** Enabled

## 🎯 Learning Objectives
1. Understand I2C protocol (SDA/SCL, addressing)
2. Scan for I2C devices using `Wire.h`
3. Display text on an OLED screen using Adafruit SSD1306
4. Know the Uno Q's 3 I2C buses

## Path A — Guided 📖
1. Wire OLED: VCC→3.3V, GND→GND, SDA→D20, SCL→D21
2. Install Adafruit SSD1306 + Adafruit GFX libraries
3. Edit `starter-code/i2c_scanner.ino` — scan and report I2C devices
4. Push and verify AutoGrader passes

## 🤖 AutoGrader
| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` |
| `test_sketch_structure` | 50 pts | Sketch includes `Wire.h` and I2C scanning logic |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"What I2C address does the SSD1306 OLED use?"*
- *"Use the arduino tool to upload an I2C scanner."*
