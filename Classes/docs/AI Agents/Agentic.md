# AI Integration Architecture — gitClasses

gitClasses uses **GitHub Models** — GitHub's built-in AI inference API — to power all AI features. No external dependencies, no API keys, no third-party services.

## How It Works

```
Teacher fills in form                Student pushes code
        │                                    │
        ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│  workflow_dispatch│              │  classroom.yml    │
│  generate-module  │              │  (AutoGrader)     │
│  generate-pages   │              │                   │
└────────┬─────────┘              └────────┬──────────┘
         │                                 │
         ▼                                 ▼ (on failure)
┌──────────────────┐              ┌──────────────────┐
│ actions/ai-       │              │ actions/ai-       │
│ inference@v1      │              │ inference@v1      │
│                   │              │                   │
│ Reads .prompt.yml │              │ Reads .prompt.yml │
│ Calls GitHub      │              │ Explains failure  │
│ Models API        │              │ in plain English   │
└────────┬─────────┘              └────────┬──────────┘
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ Opens draft PR    │              │ Posts comment on  │
│ with AI content   │              │ student's PR      │
│ for teacher review│              │                   │
└──────────────────┘              └──────────────────┘
```

## Components

### 1. Prompt Files (`.github/prompts/`)

All AI behavior is controlled by **editable YAML prompt files** committed to the repo. Teachers can customize these in the GitHub web editor — no code required.

| Prompt File | Purpose | Used By |
|------------|---------|---------|
| `generate-module.prompt.yml` | Generates a complete module (README, code, tests, resources) | `generate-module.yml` workflow |
| `generate-pages-site.prompt.yml` | Generates a premium GitHub Pages course website | `generate-pages.yml` workflow |
| `explain-test-failure.prompt.yml` | Explains AutoGrader failures in plain English | `classroom.yml` workflow |
| `generate-quiz.prompt.yml` | Generates 3 bonus challenge questions from student code | `classroom.yml` workflow |
| `review-guide.prompt.yml` | Generates tailored peer review guidance from PR diffs | `ai-peer-review.yml` workflow |
| `generate-contract-curriculum.prompt.yml` | Generates a personalized learning guide from an approved Learning Contract | `contract-curriculum.yml` workflow |

### 2. AI Workflows (`.github/workflows/`)

| Workflow | Trigger | What It Does |
|---------|---------|-------------|
| `generate-module.yml` | Manual (workflow_dispatch) | Teacher fills in topic/difficulty → AI generates module → draft PR |
| `generate-pages.yml` | Manual (workflow_dispatch) | Scans existing modules → AI generates course website → draft PR |
| `classroom.yml` | On push | Runs AutoGrader; on failure explains what went wrong; on success posts bonus quiz questions |
| `ai-peer-review.yml` | On PR opened | Reads the diff, generates specific review guidance for both sides |
| `contract-curriculum.yml` | On issue comment ("Approved") | Parses Learning Contract → generates personalized curriculum → posts on issue |

### 3. The `actions/ai-inference` Action

This is GitHub's **official, first-party** Action for calling GitHub Models from workflows:

```yaml
- uses: actions/ai-inference@v1
  with:
    prompt-file: '.github/prompts/explain-test-failure.prompt.yml'
    input: |
      test_output: ${{ steps.test.outputs.output }}
      student_code: ${{ steps.code.outputs.content }}
```

- **Auth:** Uses `GITHUB_TOKEN` automatically — no API keys to manage
- **Permission:** Requires `models: read` in the workflow permissions block
- **Models:** GPT-4o-mini (default), GPT-4o, Llama, Mistral, DeepSeek, and more
- **Output:** Available as `steps.NAME.outputs.response` or written to a file

---

## For Teachers: How to Use

### Generate a New Module

1. Go to **Actions** tab in your repo
2. Click **"🤖 Generate AI Module"** in the left sidebar
3. Click **"Run workflow"**
4. Fill in: topic, module number, difficulty, prerequisites
5. Wait ~30 seconds — a draft PR appears with the generated module
6. Review, edit, and merge

### Generate the Course Website

1. Go to **Actions** → **"🎨 Generate Course Website"**
2. Click **"Run workflow"**
3. Fill in: course title, description, organization name
4. Wait ~30 seconds — a draft PR appears with `index.html`
5. Review, merge, and the site deploys automatically to GitHub Pages

### Customize AI Behavior

Edit the `.prompt.yml` files directly in the GitHub web editor:
- `.github/prompts/generate-module.prompt.yml` → change what modules look like
- `.github/prompts/explain-test-failure.prompt.yml` → change how failures are explained
- `.github/prompts/review-guide.prompt.yml` → change what reviewers are asked to look for

---

## Rate Limits (Free Tier)

| Model | Requests/Min | Requests/Day | Best For |
|-------|-------------|-------------|---------|
| gpt-4o-mini | 15 | 150 | Test explanations, review guidance, module generation |
| gpt-4o | 10 | 50 | Complex module generation (if needed) |

For a class of 30 students, `gpt-4o-mini` at 150 requests/day is sufficient for:
- ~30 AutoGrader failure explanations per day
- ~30 PR review guides per day
- A few module generations per week

Teachers can upgrade to metered billing via GitHub Settings if higher throughput is needed.

---

## Design Decisions

### Why GitHub Models (not OpenAI API directly)?
- **Zero setup:** Every GitHub user already has access — no API keys, no billing accounts
- **Works in Actions:** `GITHUB_TOKEN` is available automatically in every workflow
- **No vendor lock-in:** The prompts are plain YAML — swap to any OpenAI-compatible API later

### Why custom prompts (not a framework like LangChain)?
- **No dependencies:** Prompts are `.yml` files — no `pip install`, no `node_modules`
- **Teacher-editable:** Any teacher can edit a YAML file in the GitHub web editor
- **Versionable:** Prompt changes go through the same PR/review workflow as everything else

### Why not OpenMAIC?
- **AGPL-3.0 license** would contaminate the template repo
- **Full Node.js application** (300+ npm packages) — wrong scale for our needs
- **Interactive simulations** are its strength, but gitClasses focuses on text/code/quiz content
- Documented as an optional external tool at [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) for teachers who want rich multimedia

---

## Path C: Student AI Contributions

In gitClasses, AI is not a black box—it is infrastructure that students can improve.
Expert-level (Path C) students are encouraged to submit Pull Requests to modify the YAML prompt templates in `.github/prompts/`. This allows students to:
- Make the AutoGrader failure explanations clearer
- Improve the quality of peer review guidance
- Add edge-case questions to the bonus quiz generator

All prompt changes go through the standard peer review and teacher approval process.

---

## References

- [GitHub Models Documentation](https://docs.github.com/en/github-models)
- [actions/ai-inference](https://github.com/marketplace/actions/ai-inference) — official GitHub Action
- [GitHub Skills](https://github.com/skills) — GitHub's own Actions-based course framework
- [microsoft/generative-ai-for-beginners](https://github.com/microsoft/generative-ai-for-beginners) — structural inspiration (MIT, 110k ⭐)
