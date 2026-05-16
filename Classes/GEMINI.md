# GEMINI.md

This file provides guidance to AI coding assistants when working with code in this repository.

## What This Repo Is

**Sensai Arduino Classes** is a GitHub template repository for deploying Arduino & IoT courses using GitHub Classroom. Teachers fork/template this repo to create a class; students get private workspace repos via GitHub Classroom invitation links. The platform is entirely GitHub-native — no external services, no API keys beyond `GITHUB_TOKEN`. On-device AI tutoring is powered by **Sensai** running on the Arduino Uno Q.

Core mechanics:
- Students push Arduino sketches → GitHub Actions validates sketch structure → score posted as a GitHub Check
- On validation failure, AI explains the error in plain English and posts it as a PR comment
- On success, AI generates a bonus quiz from the student's actual Arduino code
- When a teacher comments "Approved" on a Learning Contract issue, AI generates a personalized Arduino curriculum
- Peer review is enforced: PRs aren't complete until the student has reviewed 2 peers' PRs

## Validating Arduino Sketches

```bash
# Check sketch structure (every .ino must have setup() and loop())
grep -l "void setup()" curriculum-master/modules/*/starter-code/*.ino
grep -l "void loop()" curriculum-master/modules/*/starter-code/*.ino

# Compile check (requires arduino-cli)
arduino-cli compile --fqbn arduino:zephyr:unoq curriculum-master/modules/module-01-welcome/starter-code/
```

## Architecture

### Grading Model (100 pts per module)
| Component | Points | Mechanism |
|-----------|--------|-----------|
| Sketch Mastery | 50 | Arduino sketch structure validation + compile check |
| Learning Contract | 25 | `learning-contract.md` exists and has >50 chars |
| Community Contribution | 25 | Any `.md` file in `community-resources/` (excluding README) |

### GitHub Actions Workflows
- **`classroom.yml`** — Runs on every push. Validates Arduino sketches, then posts AI failure explanation or AI quiz via `actions/ai-inference@v1`.
- **`peer-review.yml`** — Runs on PR open. Posts peer review instructions and adds `needs-peer-review` label.
- **`contract-curriculum.yml`** — Triggered by issue comments. When a non-author comments "Approved" on an issue labeled `contract-pending`, it parses the Learning Contract body, calls AI to generate a personalized Arduino curriculum.
- **`deploy-pages.yml`** — Deploys the entire repo root to GitHub Pages on every push to `main`.

### AI Prompts
All AI behavior is controlled by `.github/prompts/*.prompt.yml` — plain YAML with `messages` (system + user) and a `model` field. Currently using `openai/gpt-4o-mini` via GitHub Models (free). These files are the intended customization surface for teachers and Path C students.

### Learning Paths
- **Path A (Guided)** — Follow starter Arduino sketches in `modules/*/starter-code/`
- **Path B (Explorer)** — Build an original Arduino/IoT project; requires Learning Contract issue approval
- **Path C (Expert)** — Submit PRs to `curriculum-master/` to improve the course itself

### Key File Locations
- Starter sketches: `curriculum-master/modules/module-*/starter-code/`
- Tests: `curriculum-master/modules/module-*/tests/`
- AI prompts: `.github/prompts/`
- Issue templates: `.github/ISSUE_TEMPLATE/`
- Student-contributed resources: `curriculum-master/community-resources/`
- Required student file: `learning-contract.md` at repo root

## Adding a New Module

1. Create `curriculum-master/modules/module-NN-topic/` with `README.md`, `starter-code/`, `tests/`, and `resources.md`
2. Add Arduino sketch validation to the test file
3. Add a grader step to `.github/workflows/classroom.yml`
4. Update `curriculum-master/README.md` module map

## Webapp (`/webapp`)

A Next.js 16 (App Router) platform serving as the Arduino Classes admin/student dashboard.

### Running the Webapp
```bash
cd webapp
npm install
npm run dev       # http://localhost:3000
```

### Tech Stack
- **Next.js 16.2** with App Router, TypeScript, Tailwind CSS
- **next-auth v4** with GitHub OAuth
- **@octokit/rest** for GitHub API
- **better-sqlite3** for persistent SQLite database
- **GitHub Models** for AI chat

### Code Style
- All Arduino sketches must have `void setup()` and `void loop()`
- Use `const int PIN_NAME = X;` for pin declarations
- Default Serial baud rate: `9600`
- Note Uno Q 3.3V differences from classic 5V Uno
- Use `// 💡` for learning moments, `// ⚠️` for warnings
