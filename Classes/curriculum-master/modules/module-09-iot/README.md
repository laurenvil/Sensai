# 🌐 Module 09 — IoT Projects
> **Estimated Time:** 2–3 class periods | **AutoGrader:** Enabled

## 🎯 Learning Objectives
1. Understand the Sense → Process → Act IoT pattern
2. Build a smart plant watering system with soil moisture + relay
3. Create a weather station with OLED display
4. Learn hysteresis to prevent actuator flickering

## Path A — Guided 📖
1. Wire soil moisture sensor to A0, relay to D4, status LED to D13
2. Edit `starter-code/smart_plant.ino` — auto-water when soil is dry
3. Push and verify AutoGrader passes

## Path B — Explorer 🚀
- Build a weather station with DHT + OLED
- Create a smart light with smooth fade
- Design a multi-zone irrigation system

## 🤖 AutoGrader
| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` |
| `test_sketch_structure` | 50 pts | Sketch reads sensor, makes decision, controls actuator |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"Help me design a smart plant watering system."*
- *"What is hysteresis and why is it important?"*
