# 💬 Module 06 — Talking to the Computer
> **Estimated Time:** 1–2 class periods | **AutoGrader:** Enabled

## 🎯 Learning Objectives
1. Use `Serial.print()` and `Serial.println()` to send data
2. Receive and parse serial commands with `Serial.available()` and `Serial.readString()`
3. Format sensor data as CSV for spreadsheet analysis
4. Build a simple command-line interface for hardware control

## Path A — Guided 📖
1. Edit `starter-code/serial_commands.ino` — parse "on", "off", "blink" commands
2. Test with the Serial Monitor (baud: 9600)
3. Push and verify AutoGrader passes

## 🤖 AutoGrader
| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | `learning-contract.md` in repo root |
| `test_sketch_structure` | 50 pts | Sketch uses `Serial.begin()`, `Serial.available()`, and `if/else` |
| `test_community_contribution` | 25 pts | Add `.md` to `community-resources/` |

## 🤖 Ask Sensai
- *"Help me format sensor output as CSV."*
- *"What is baud rate and why must it match?"*
