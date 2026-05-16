# 🎓 gitClasses — Open Classroom Framework

> **A Udemy-styled GitHub learning system** built on Git/Fork/CI-CD workflows.  
> Teachers deploy courses in one click. Students learn through real Pull Requests, AutoGrading, and Peer Review.  
> AI works behind the scenes — generating content, explaining failures, and facilitating feedback.

---

## 🚀 Quick Start

### For Teachers
| Step | Action |
|------|--------|
| 1 | Click **"Use this template"** → create your class org repo |
| 2 | Open [GitHub Classroom](https://classroom.github.com/) → link this template as an Assignment |
| 3 | *(Optional)* Go to **Actions** → **"🤖 Generate AI Module"** → create modules instantly |
| 4 | *(Optional)* Go to **Actions** → **"🎨 Generate Course Website"** → build a course site |
| 5 | Share the **Invitation URL** — students handle the rest |

> 💡 AI features use [GitHub Models](https://docs.github.com/en/github-models) — free, no API keys, works with your existing `GITHUB_TOKEN`.

### For Students
| Step | Action |
|------|--------|
| 1 | Click the **Invitation Link** your teacher shared |
| 2 | Accept the assignment — your private workspace is created instantly |
| 3 | Visit `Settings → Pages` to find your live course site |
| 4 | Open `module-01-basics/README.md` and choose your **Learning Path** |

> 🤖 If a test fails, AI explains what went wrong and suggests a fix — right in your PR.

---

## 🛤️ Three Learning Paths (Choose Your Own Adventure)

| Path | Who It's For | How to Start |
|------|-------------|-------------|
| **A — Guided** | New learners | Follow `module-01-basics/README.md` step by step |
| **B — Explorer** | Self-directed | Open an Issue using the **Learning Contract** template |
| **C — Expert** | Advanced | Submit a PR to the `curriculum-master` to improve the course itself |

---

## 🤖 How AutoGrading Works

Every `git push` triggers a GitHub Actions workflow that:
1. Runs `pytest` against your code
2. Reports a **score out of 100** directly in the PR
3. Shows a ✅ green check or ❌ red X next to your commit
4. **If tests fail:** AI explains the failure in plain English and suggests a fix

**Grading Breakdown:**
| Component | Points | What It Checks |
|-----------|--------|----------------|
| Module Mastery | 50 pts | Core code logic passes tests |
| Learning Contract | 25 pts | `learning-contract.md` exists and is filled out |
| Community Contribution | 25 pts | You added a resource to `community-resources/` |

---

## 🤝 Peer Review (Required for Completion)

Your PR will not be marked **Complete** until you:
1. Leave **2 meaningful code reviews** on peers' Pull Requests
2. Your PR receives **1 peer approval**

> 💬 When you open a PR, AI generates a tailored review guide based on your actual code changes — helping both you and your reviewer know what to focus on.

See [COMMUNITY_GUIDELINES.md](./COMMUNITY_GUIDELINES.md) for the Code of Review.

---

## 🧰 AI-Powered Workflows (For Teachers)

All AI features use [GitHub Models](https://docs.github.com/en/github-models) via `actions/ai-inference` — no external services, no API keys, no cost.

| Workflow | What It Does | How to Run |
|---------|-------------|-----------|
| **🤖 Generate AI Module** | Creates a complete module (README, code, tests, resources) from a topic | Actions → Run workflow |
| **🎨 Generate Course Website** | Builds a premium GitHub Pages site from your existing modules | Actions → Run workflow |
| **AutoGrader Explainer** | Explains test failures in plain English | Automatic — runs on every failed push |
| **Bonus Quiz Generator** | Posts 3 challenge questions from the student's actual code | Automatic — runs on every passing push |
| **Review Facilitator** | Posts tailored review guidance on every new PR | Automatic — runs on every PR |
| **Contract Curriculum** | Generates a personalized learning guide when a Learning Contract is approved | Automatic — triggered by teacher "Approved" comment |

> 📝 **Customize AI behavior** by editing the `.prompt.yml` files in `.github/prompts/`. They're plain YAML — no code required.
> 🧠 **Path C students** can submit PRs to improve these prompts — see the [Curriculum Overview](curriculum-master/README.md).

---

## 📂 Repository Structure

```
gitClasses/
├── .devcontainer/
│   └── devcontainer.json          # One-click Codespaces dev environment
├── .github/
│   ├── ISSUE_TEMPLATE/            # Learning Contract, Bug Report, Curriculum Improvement
│   ├── prompts/                   # AI prompt templates (teacher-editable YAML)
│   │   ├── generate-module.prompt.yml
│   │   ├── generate-pages-site.prompt.yml
│   │   ├── explain-test-failure.prompt.yml
│   │   ├── generate-quiz.prompt.yml
│   │   ├── review-guide.prompt.yml
│   │   └── generate-contract-curriculum.prompt.yml
│   └── workflows/
│       ├── deploy-pages.yml       # Auto-deploys course site to GitHub Pages
│       ├── classroom.yml          # AutoGrading + AI failure explanation + bonus quiz
│       ├── peer-review.yml        # Peer review instructions on PR open
│       ├── ai-peer-review.yml     # AI-generated review guidance from diffs
│       ├── generate-module.yml    # Teacher: AI module generator
│       ├── generate-pages.yml     # Teacher: AI course website generator
│       └── contract-curriculum.yml # Auto: personalized curriculum on contract approval
├── curriculum-master/
│   ├── README.md                  # Course overview & module map
│   ├── community-resources/       # Student-contributed resources (graded!)
│   └── modules/
│       ├── module-01-basics/      # Git fundamentals, first PR
│       └── module-02-branching/   # Feature branches, merge conflicts
├── docs/
│   ├── AI Agents/Agentic.md       # AI architecture documentation
│   └── TEACHER_SETUP.md           # Full teacher deployment guide
├── webapp/                        # Next.js Teacher Admin & Student Dashboard (SaaS platform)
│   ├── src/
│   │   ├── app/                   # App Router routes + API handlers
│   │   ├── components/            # Shared UI components
│   │   └── lib/                   # Auth, DB, GitHub API, env config
│   └── package.json               # Webapp dependencies
├── COMMUNITY_GUIDELINES.md        # Code of Review & collaboration norms
└── README.md                      # ← You are here
```

---

## 🏆 Completion Checklist

- [ ] Learning Contract issue opened and teacher-approved
- [ ] `learning-contract.md` committed to your repo
- [ ] AutoGrader passing (green check on latest commit)
- [ ] 2 peer PR reviews left (link them in your PR description)
- [ ] 1 resource added to `curriculum-master/community-resources/`

---

---

## Webapp — Teacher Admin & Student Dashboard

The `/webapp` directory contains a full Next.js 16 SaaS platform with two deployment tiers:

| Tier | Branch | Description |
|------|--------|-------------|
| **Free / Classroom** | `main` | Stateless — GitHub OAuth, no database, GitHub Classroom handles repos |
| **Production SaaS** | `gitClass` | GitHub App auth, SQLite database, webhook-driven grades, automated repo distribution |

**Quick start:**
```bash
cd webapp
npm install
cp .env.local.example .env.local  # fill in credentials
npm run dev
```

Routes: `/` landing · `/dashboard` student progress · `/courses` module catalog · `/ai` AI assistant · `/admin` teacher panel · `/docs` documentation hub

> See [`docs/WebApp/ProductionSaaS.md`](./docs/WebApp/ProductionSaaS.md) for the full production deployment guide.

---

*Built on the Open Classroom model — where everyone is both a teacher and a student.*
