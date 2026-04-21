---
name: arduino-app-lab
description: Arduino App Lab — the unified editor for the Uno Q that builds and runs projects on both the MPU and MCU at once. Read this when the user asks about App Lab, Bricks, Apps, deploying a project, "Run" button workflow, or how Python+sketch projects are structured. Sensai itself is a Sensai-customized alternative entry point, but understanding App Lab is essential context.
---

# Arduino App Lab on the Uno Q

**App Lab** is Arduino's unified development environment for the Uno Q. It builds and runs **Apps** — projects that span both the Linux MPU side (Python) and the Arduino MCU side (sketch). Apps can also include **Bricks** — pre-packaged services (AI models, web UIs, REST API clients) that drop into a project.

## Anatomy of an App

```
my-app/
├── main.py              ← Python code, runs on the Linux MPU
├── sketch.ino           ← Arduino code, runs on the STM32U585 MCU
└── bricks/              ← optional pre-packaged services
    └── speech-to-text/
        └── ...
```

When the student presses **Run**:

1. App Lab cross-compiles the `.ino` for `arduino:zephyr:unoq`.
2. It flashes the MCU via the same OpenOCD path Sensai uses (sketch partition `0x8100000`).
3. It launches `main.py` on the Linux side.
4. Any Bricks listed in the project are started as Linux services alongside the Python program.
5. Bridge initializes on both sides and the App is live.

## Where Sensai fits

| Tool | Strength | When to use |
|---|---|---|
| **Sensai (agentic path)** | Natural language → code; quick "write a sketch and flash it" loop without leaving the chat | Ad-hoc experiments, classroom Q&A, "make the LED do X" prompts |
| **Sensai (direct path)** | Fast factual Q&A about the board | Reference lookups, voltage rules, pinouts |
| **App Lab** | Full IDE; multi-file projects; Brick management; debugging | Real projects that combine sketch + Python + Bricks |

Sensai can write a sketch and flash it via the `arduino` tool. It does not currently package Apps or manage Bricks — for those workflows, the student opens App Lab and copies Sensai's output in.

## When to use App Lab vs Sensai

| Lesson scenario | Tool |
|---|---|
| "Blink D9 every second" | **Sensai (agentic)** — single sketch, no Python |
| "Read A0 from a Python script via Bridge" | App Lab — multi-file App with sketch + main.py |
| "Run a face-detection model and move a servo" | App Lab — needs a vision Brick + Python + sketch |
| "Which pins are PWM-capable?" | **Sensai (direct)** — factual lookup |
| "Walk me through writing my first Bridge project" | Either — Sensai for the code, App Lab to actually deploy as a multi-file App |

## Reference files

- `references/bricks.md` — what Bricks are, where they come from, how to use them.
- `references/deploy.md` — the full Run-button workflow and the three console tabs (Start-up, Main, Sketch).

## Pitfalls

- **Treating Sensai as a replacement for App Lab.** Sensai is great for code generation and answering questions. App Lab is the proper home for multi-file projects, Bricks, and deployment.
- **Editing `~/.picoclaw/workspace/` and expecting App Lab to see it.** Those are Sensai's workspace files (SOUL.md, skills, sessions), not App Lab Apps. App Lab Apps live wherever you save them in App Lab.
- **Confusing a Brick with an Arduino library.** Bricks are Linux-side services managed by App Lab. Arduino libraries (`.h` files) are MCU code included with `#include`. They serve different sides of the dual-chip architecture.

## See also

- `bridge/SKILL.md` — Bridge is what connects the App's two sides.
- `sketch-patterns/references/upload.md` — how Sensai uploads sketches, which is the same OpenOCD path App Lab uses.
