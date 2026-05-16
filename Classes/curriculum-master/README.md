# 🏛️ Arduino Classes — Curriculum Overview

> **The living document of this course** — maintained collaboratively by teachers and Path C Expert students.

---

## 📋 Course Philosophy

This curriculum is built on three principles from the Open Classroom model:

1. **Hands-On Learning** — Students learn by building real circuits and writing real Arduino code. Sensai AI guides them through inquiry-based exploration.
2. **Real-World Workflow** — Every concept is submitted through Git/GitHub — the same tools professional engineers use daily.
3. **Community-Driven Growth** — You learn faster by teaching others. Expert students shape the curriculum itself.

---

## 🗺️ Module Map

| Module | Topic | AutoGrader | Peer Review |
|--------|-------|-----------|-------------|
| [01 — Welcome to Arduino](./modules/module-01-welcome/README.md) | Microcontrollers, Uno Q anatomy, first sketch | ✅ | Required |
| [02 — Your First Circuit](./modules/module-02-circuits/README.md) | Breadboards, LEDs, resistors, blink | ✅ | Required |
| [03 — Variables & Logic](./modules/module-03-logic/README.md) | Buttons, if/else, state, reaction timer | ✅ | Required |
| 04 — Reading the World *(coming soon)* | analogRead, potentiometers, map() | 🔜 | Required |
| 05 — Sensing the Environment *(coming soon)* | DHT sensors, libraries, alerts | 🔜 | Required |
| 06 — Talking to the Computer *(coming soon)* | Serial communication, CSV logging | 🔜 | Required |
| 07 — Making Things Move *(coming soon)* | PWM, servos, buzzers | 🔜 | Required |
| 08 — Advanced Communication *(coming soon)* | I2C, OLED displays, SPI | 🔜 | Required |
| 09 — IoT Projects *(coming soon)* | Smart plant, weather station, Bridge API | 🔜 | Required |
| 10 — 🎓 Demo Day *(coming soon)* | Capstone project, presentation, entrepreneurship | 🔜 | Required |

> 📚 **Full lesson content** is in the companion [`curriculum/`](../../curriculum/) directory. These modules contain the graded assignments and starter code that integrate with GitHub Classroom.

---

## 🤝 Community Resources

Student-contributed Arduino resources live in [`community-resources/`](./community-resources/).  
Adding a file here is worth **25 points** on the AutoGrader.

---

## ✏️ Contributing to This Curriculum (Path C)

See the [Module Improvement issue template](../.github/ISSUE_TEMPLATE/curriculum_improvement.md) to propose changes.

All improvements go through the standard PR + peer review process — the same workflow you're learning in the modules.

### What Path C Students Can Contribute

| Contribution Type | Where | Example |
|-------------------|-------|---------|
| Fix a bug or typo | `curriculum-master/modules/` | Correct a wiring diagram in `README.md` |
| Add a test case | `modules/*/tests/` | Add edge-case validation for a sketch |
| Improve resources | `community-resources/` | Add a curated Arduino tutorial or sensor guide |
| **Improve AI prompts** | `.github/prompts/` | Make the AI generate better Arduino modules, explain compilation errors more clearly, or give reviewers better guidance |
| **Add a new sketch** | `modules/*/starter-code/` | Contribute a new challenge sketch for a module |

### How to Contribute to AI Prompts

The AI behavior in Classes is controlled by plain YAML files in `.github/prompts/`. Path C students can:

1. Read the current prompt (e.g., `.github/prompts/explain-test-failure.prompt.yml`)
2. Identify an improvement (e.g., "the explanation should include a link to the relevant Arduino docs")
3. Edit the YAML prompt — change the system instructions or output format
4. Open a PR with your change — explain why the improvement helps students
5. The teacher reviews and merges — the AI behavior updates immediately

---

## 📂 Curriculum Structure

```text
curriculum-master/
├── README.md                    # Course overview & module map (You are here)
├── community-resources/         # Student-contributed Arduino resources (graded!)
└── modules/
    ├── module-01-welcome/       # Arduino intro, first sketch
    │   ├── README.md
    │   ├── resources.md
    │   ├── starter-code/
    │   │   └── hello_serial.ino
    │   └── tests/
    │       └── test_sketch.py
    ├── module-02-circuits/      # LEDs, breadboards, blink
    │   ├── README.md
    │   ├── starter-code/
    │   │   └── blink.ino
    │   └── tests/
    │       └── test_sketch.py
    └── module-03-logic/         # Buttons, variables, if/else
        ├── README.md
        ├── starter-code/
        │   └── button_led.ino
        └── tests/
            └── test_sketch.py
```
