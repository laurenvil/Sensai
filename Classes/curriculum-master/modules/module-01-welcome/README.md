# 🤖 Module 01 — Welcome to Arduino

> **Estimated Time:** 1–2 class periods  
> **AutoGrader:** Enabled — you'll see ✅ or ❌ after every `git push`

---

## 🎯 Learning Objectives

By the end of this module, you will be able to:

1. Explain what a microcontroller is and how Arduino works
2. Identify the key parts of the Arduino Uno Q board
3. Write your first Arduino sketch with `setup()` and `loop()`
4. Push your code to GitHub and see the AutoGrader run
5. Open a Pull Request and respond to peer review feedback

---

## 🛤️ Choose Your Path

### Path A — Guided 📖
Follow these steps **in order**:

1. **Read** `resources.md` — learn about microcontrollers and the Uno Q board
2. **Edit** `starter-code/hello_serial.ino` — complete the sketch to print a message to the Serial Monitor
3. **Create** `learning-contract.md` using the template below
4. **Push** your changes — watch the AutoGrader run in the Actions tab
5. **Open a Pull Request** when the AutoGrader shows ✅

### Path B — Explorer 🚀
Use the core Arduino concepts to build something original:

- A custom serial greeting that asks for the user's name
- A serial-based quiz game
- A Morse code translator
- Your own idea? Open a Learning Contract issue and describe it!

### Path C — Expert 🧠
Improve this curriculum or the AI that powers it:

- Find a bug or confusing section → open a Bug Report issue
- Propose an improvement → open a Module Improvement issue
- Submit a Pull Request to `curriculum-master` with your changes

---

## 📋 The `learning-contract.md` Template

Create this file in your **repo root** (the AutoGrader checks for it):

```markdown
# My Learning Contract — Module 01

**Name:** 
**Path:** A / B / C

## My 3 Arduino Goals
1. 
2. 
3. 

## My Timeline
- Contract approved: 
- First sketch uploaded: 
- AutoGrader passing: 
- PR opened: 

## Peer Review Pledge
I will review 2 peers' PRs before mine is merged.
```

---

## 🤖 AutoGrader — What's Being Tested

| Test | Points | What To Do |
|------|--------|-----------|
| `test_learning_contract_exists` | 25 pts | Create `learning-contract.md` in repo root |
| `test_sketch_has_setup_and_loop` | 50 pts | Your sketch must have `void setup()` and `void loop()` |
| `test_community_contribution` | 25 pts | Add a `.md` file to `curriculum-master/community-resources/` |

**Total: 100 points**

---

## 🤖 Ask Sensai

If you have an Uno Q board with Sensai:

- *"What is the difference between the MPU and MCU on the Uno Q?"*
- *"Use the arduino tool to upload a sketch that prints my name to the serial monitor."*
- *"What does `void setup()` do?"*

---

## 🔗 Resources

See [resources.md](./resources.md) for curated Arduino tutorials, docs, and tools.

---

*When you're ready to submit, open a Pull Request using the PR template. The peer-review bot will guide you from there.*
