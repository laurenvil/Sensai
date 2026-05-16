# AI Curriculum Generation — Options Assessment

## The Core Question

Can you build AI-assisted course generation **directly inside gitClasses** without depending on OpenMAIC?

**Short answer: Yes, absolutely — and GitHub Models makes it the right call.**

---

## What Actually Exists to Look At

### Repos Researched

| Repo | Stars | License | What It Is | Verdict for gitClasses |
|------|-------|---------|-----------|----------------------|
| [microsoft/generative-ai-for-beginners](https://github.com/microsoft/generative-ai-for-beginners) | 110k | MIT | 21 static lessons with code notebooks; uses GitHub Actions for automated translation into 50 languages | **Excellent structural model** — not a generator, but shows how to build a modular markdown course with Actions CI |
| [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | 16.4k | AGPL-3.0 | Full Next.js multi-agent app that generates interactive classrooms | ❌ Wrong fit — full application, AGPL license, cannot embed directly |
| [github/skills/*](https://github.com/skills) | Various | MIT | GitHub's own Actions-based interactive course templates | **Directly aligned** — same paradigm as gitClasses, worth borrowing from |
| [pramodkoujalagi/Automated-Course-Content-Generator](https://github.com/pramodkoujalagi/Automated-Course-Content-Generator) | Low stars | Unknown | Simple LLM-to-markdown course generator | Too rudimentary; not maintained |
| [ThanhDatVu111/AI_CourseGenerator](https://github.com/ThanhDatVu111/AI_CourseGenerator) | Low stars | Unknown | Student project, Next.js course generator | Not production-grade; wrong stack for gitClasses |

**Finding:** There is no well-maintained, MIT/Apache-licensed, GitHub-native AI curriculum generation repo worth forking. The space either produces full applications (like OpenMAIC) or low-quality student projects. **Custom code is the right call.**

---

## GitHub Models: What It Actually Is and Can Do

### The Technical Reality

GitHub Models is **not just a playground** — it is a production inference API:

- **Endpoint:** `https://models.github.ai/inference/chat/completions`
- **Auth:** Your existing `GITHUB_TOKEN` — no external API keys required in Actions
- **Protocol:** OpenAI-compatible `chat/completions` spec
- **Models available:** GPT-4o, GPT-4o-mini, Llama 3.3, Mistral, DeepSeek, Phi-4, Cohere Command, and more
- **Official GitHub Action:** `actions/ai-inference@v1` — published by GitHub themselves (not a third party), 471 stars, verified

### Rate Limits (Free Tier)

| Tier | RPM | Requests/Day | Context |
|------|-----|-------------|---------|
| Low (gpt-4o-mini) | 15 | 150 | 8k tokens |
| High (gpt-4o) | 10 | 50 | 8k tokens |

> **Important:** These limits are per-repo, per-day. For a classroom with 30 students each pushing 2–3 commits per day, you hit gpt-4o's free tier limit quickly. **gpt-4o-mini is the right model** — it's in the Low tier (150 req/day), cheaper if you add a key, and fully capable of markdown generation and failure explanations.

### Can GitHub Models Generate Full Curriculum?

**Yes, with caveats:**

| Use Case | GitHub Models Capable? | Notes |
|---------|----------------------|-------|
| Generate a module README (learning objectives, overview) | ✅ Yes | Single API call, ~500 tokens output |
| Generate a quiz (5–10 questions with answers) | ✅ Yes | JSON schema output supported |
| Generate starter code scaffolding | ✅ Yes | Keep prompts focused |
| Generate a full 5,000-word lesson | ⚠️ Partial | Token limits require chunking into sections |
| Generate interactive simulations (HTML5, 3D) | ❌ No | Requires specialized rendering (OpenMAIC's niche) |
| AI-explained test failure | ✅ Yes | Best fit — short input/output, high value |
| AI peer review guide | ✅ Yes | Best fit — already implemented in our workflow |

### The `actions/ai-inference` Action (Key Finding)

GitHub published this officially in 2025. It supports:
- Inline prompts or `.prompt.yml` files committed to `.github/prompts/`
- JSON schema responses (structured output — critical for quiz generation)
- Template variables (`{{topic}}`, `{{module_name}}`)
- Output written to a file (bypasses the GitHub Actions output size limit)
- **MCP integration** — can read repo context (issues, PRs, file content) directly

This means prompts for curriculum generation can live as **versioned, teacher-editable files** in `.github/prompts/`. Teachers customize the prompts; the Action runs them.

---

## The Custom Build Option: What to Actually Build

Rather than forking anything, you build three small, purpose-built components inside gitClasses:

### Component 1: Module Generator (`workflow_dispatch` trigger)

A teacher-triggered GitHub Action that:
1. Takes `topic` and `module_slug` as workflow inputs
2. Uses `actions/ai-inference` with a `.prompt.yml` file stored in `.github/prompts/generate-module.prompt.yml`
3. Generates the module README, quiz JSON, and resources list in one pass
4. Commits the output to a new branch → opens a draft PR for teacher review

**No external dependencies.** ~100 lines of YAML + one prompt file.

### Component 2: AutoGrader Explainer (already planned)

On every `classroom.yml` run:
1. Capture pytest output
2. Send it to `actions/ai-inference` with the prompt: *"Explain why this Python test failed in plain English for a high school student. Suggest one specific fix."*
3. Post the explanation as a PR comment

**No external dependencies.** ~30 lines added to existing `classroom.yml`.

### Component 3: PR Review Facilitator (already built)

What we already wrote in `ai-peer-review.yml` — but can be enhanced to use `actions/ai-inference` instead of the current hardcoded template for richer, dynamic guidance.

---

## Comparison: Fork OpenMAIC vs. Custom Build

| Criteria | Fork OpenMAIC | Custom Build (GitHub Models) |
|---------|--------------|------------------------------|
| **License** | AGPL-3.0 — contaminates your project | MIT (yours) |
| **Dependencies** | Node.js 20, pnpm, 300+ npm packages | None — only YAML and `actions/ai-inference` |
| **Maintenance** | Fork falls behind upstream; you own all bugs | GitHub maintains the Action; you own the prompts |
| **Setup for teachers** | Clone repo, install Node, configure .env | Zero — works with GITHUB_TOKEN |
| **Interactive simulations** | ✅ Yes | ❌ No (text + quiz only) |
| **Curriculum generation** | ✅ Yes (rich) | ✅ Yes (text/quiz/code) |
| **AI test failure explanation** | Could work via its API | ✅ Native, simpler |
| **Student workflow integration** | Would need significant custom glue code | ✅ Already inside the workflow system |
| **Cost** | API key required for LLM | Free (GITHUB_TOKEN) up to rate limits |
| **Deploy complexity** | High (Codespaces or separate server) | None — runs in the existing Actions runner |

---

## The GitHub Skills Structural Model

**This is the most important finding.** GitHub's own `skills/*` repos are architecturally identical to gitClasses and show exactly how GitHub itself builds teacher-driven, Actions-powered learning systems:

- `.github/workflows/N-step-name.yml` — one workflow per course step
- `.github/steps/` — markdown content files for each step
- `.github/prompts/` — AI prompt files (newer courses)
- `README.md` — the learner interface
- `.devcontainer/` — optional Codespaces config

gitClasses already follows this model. The lesson: **don't fork a course generator — build a prompt file system, just like GitHub Skills does internally.**

---

## Recommendation

**Build custom. Use GitHub Models. No fork needed.**

### Implementation Stack (Zero Dependencies)

```
.github/
├── prompts/
│   ├── generate-module.prompt.yml     ← Teacher edits this to shape AI output
│   ├── explain-test-failure.prompt.yml
│   └── review-guide.prompt.yml
└── workflows/
    ├── generate-module.yml            ← workflow_dispatch: teacher triggers generation
    ├── classroom.yml                  ← MODIFIED: add AI explainer step
    └── ai-peer-review.yml             ← MODIFIED: use ai-inference for dynamic content
```

The entire AI layer is:
- **Prompts** — plain `.yml` files that teachers can read and edit in the GitHub web UI
- **The `actions/ai-inference` Action** — maintained by GitHub, requires only `models: read` permission
- **Your existing workflows** — enhanced with one or two additional steps

No Node.js. No pnpm. No submodules. No AGPL. No external API keys. No Codespaces required.

### When Would You Still Want OpenMAIC?

Only if you want **interactive simulations** — HTML5 physics engines, 3D models, animated whiteboard drawing. GitHub Models cannot produce these. If your curriculum is primarily text, code exercises, and quizzes (which gitClasses is), you don't need it.

Document it as an optional external tool a teacher can run separately if they want that level of richness. But it should have no place in the gitClasses dependency tree.

---

*Sources: [GitHub Models docs](https://docs.github.com/en/github-models) · [actions/ai-inference marketplace](https://github.com/marketplace/actions/ai-inference) · [microsoft/generative-ai-for-beginners](https://github.com/microsoft/generative-ai-for-beginners) · [github/skills organization](https://github.com/skills)*
