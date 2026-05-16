# Walkthrough — Arduino Classes (Open Classroom System)

## What Changed

The entire `gitClasses` framework was copied into `Classes/` and transformed into the **Sensai Arduino Classes** — a GitHub-native Open Classroom system for Arduino & IoT education with AutoGrading, peer review, and Sensai AI integration.

**90 files changed** across 2 commits on the `Curriculum` branch. All `gitClasses`, `gitClass`, and `OpenFrontier` references removed.

---

## What Was Built

### 10 Graded Modules (with AutoGrader Tests)

| # | Module | Starter Sketch | Key Concepts |
|---|--------|---------------|--------------|
| 01 | Welcome to Arduino | `hello_serial.ino` | Setup/loop, Serial |
| 02 | Your First Circuit | `blink.ino` | pinMode, digitalWrite |
| 03 | Variables & Logic | `button_led.ino` | digitalRead, if/else |
| 04 | Reading the World | `pot_led.ino` | analogRead, map() |
| 05 | Sensing the Environment | `temp_humidity.ino` | DHT library, isnan() |
| 06 | Talking to the Computer | `serial_commands.ino` | Serial input, parsing |
| 07 | Making Things Move | `servo_sweep.ino` | PWM, Servo.h |
| 08 | Advanced Communication | `i2c_scanner.ino` | Wire.h, I2C protocol |
| 09 | IoT Projects | `smart_plant.ino` | Sense→Process→Act, hysteresis |
| 10 | Demo Day | `project_template.ino` | Capstone design |

Each module includes:
- **README.md** — Learning objectives, 3 paths (A/B/C), Ask Sensai section
- **starter-code/*.ino** — Arduino sketch with TODO comments for students to complete
- **tests/test_sketch.py** — pytest AutoGrader (25 pts contract + 50 pts sketch + 25 pts contribution)

### GitHub Actions & CI/CD

| File | Updated For |
|------|------------|
| `classroom.yml` | Arduino sketch validation + AI error explainer |
| `peer-review.yml` | Arduino-focused review instructions |
| `contract-curriculum.yml` | Arduino learning contracts |
| `generate-module.yml` | AI generates Arduino modules (sketches, tests, resources) |
| `generate-pages.yml` | Course website generator |
| `ai-peer-review.yml` | Arduino code review guidance |

### AI Prompt Templates (6 files)

All rewritten for Arduino/electronics context:
- `explain-test-failure.prompt.yml` — Explains Arduino sketch errors, references arduino.cc
- `generate-quiz.prompt.yml` — Hardware/PWM/ADC quiz questions from student code
- `review-guide.prompt.yml` — Checks pin assignments, voltage safety, missing Serial.begin
- `generate-module.prompt.yml` — Generates complete Arduino modules with Uno Q awareness
- `generate-contract-curriculum.prompt.yml` — Personalized Arduino learning paths
- `generate-pages-site.prompt.yml` — Course website generation

### Supporting Files

| File | What Changed |
|------|-------------|
| `README.md` | Complete Arduino Classes landing page |
| `GEMINI.md` | Arduino project conventions (replaces CLAUDE.md) |
| `TEACHER_SETUP.md` | Full Arduino classroom deployment guide |
| `COMMUNITY_GUIDELINES.md` | Arduino review checklist (voltage, pins, etc.) |
| `CODEOWNERS` | Updated for laurenvil org |
| `PULL_REQUEST_TEMPLATE.md` | 10-module Arduino checklist |
| Issue templates (3) | Bug report, module improvement, learning contract — all Arduino |
| `webapp/src/lib/constants.ts` | 10 Arduino modules, updated paths and grading weights |
| `webapp/src/app/docs/[slug]/page.tsx` | All inline docs rebranded |
| `devcontainer.json` | Added Arduino VS Code extension |

### Webapp

The Next.js webapp was preserved and rebranded:
- App name: "Arduino Classes"
- All module metadata updated for 10 Arduino modules
- All inline documentation pages rebranded
- All API route fallback orgs changed from `TheOpenFrontier` → `laurenvil`

---

## Verification Results

| Check | Result |
|-------|--------|
| "gitClass" references | ✅ **Zero** |
| "OpenFrontier" references | ✅ **Zero** |
| All .ino sketches have `setup()`/`loop()` | ✅ **10/10** |
| All modules have AutoGrader tests | ✅ **10/10** |
| Committed to Curriculum branch | ✅ `7874214b` |
| Pushed to GitHub | ✅ |

---

## Repository Structure (Final)

```
Sensai/
├── curriculum/          ← Lesson content (10 modules, no grading)
│   └── modules/01-10    ← Detailed lesson plans + reference sketches
├── Classes/             ← Open Classroom system (graded assignments)
│   ├── .github/         ← Actions, prompts, issue templates
│   ├── curriculum-master/
│   │   ├── modules/     ← 10 graded modules (starter-code + tests)
│   │   └── community-resources/
│   ├── docs/            ← Teacher setup, guidelines, dev docs
│   └── webapp/          ← Next.js admin/student dashboard
└── [Sensai core]        ← Go agent, tools, channels, config
```
