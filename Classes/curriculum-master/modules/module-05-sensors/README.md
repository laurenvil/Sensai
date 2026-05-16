# 🌡️ Module 05 — Sensing the Environment

> **Estimated Time:** 1–2 class periods | **AutoGrader:** Enabled

## 🎯 Learning Objectives
1. Install and use Arduino libraries (DHT sensor library)
2. Read temperature and humidity from a DHT11/DHT22 sensor
3. Build a heat alert system with a threshold
4. Handle sensor errors with `isnan()`

## Path A — Guided 📖
1. Install the DHT library (Library Manager → search "DHT sensor library")
2. Wire DHT11: VCC→3.3V, DATA→D2, GND→GND
3. Edit `starter-code/temp_humidity.ino` — read and print sensor data
4. Push and verify AutoGrader passes

## 🤖 AutoGrader
| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` in repo root |
| `test_sketch_structure` | 50 pts | Complete sketch with `#include <DHT.h>` and sensor reads |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"Use the arduino tool to upload a sketch that reads DHT11 on pin 2."*
- *"What's the difference between DHT11 and DHT22?"*
