# 🍎 Teacher Setup Guide — Sensai Sensai Classes

> Everything you need to launch your Arduino Open Classroom on GitHub — from zero to students building circuits in under 30 minutes.

---

## Overview

The Sensai Classes framework uses three GitHub tools working together:

```
GitHub Organization          ← Your "school building"
  └── GitHub Classroom       ← Your "gradebook & assignment manager"
        └── This Template    ← Your "course materials" (Arduino sketches, tests, AI prompts)
              └── GitHub Pages ← Your "classroom website" (auto-deployed)
```

---

## Step 1 — Create a GitHub Organization

1. Go to [github.com/organizations/new](https://github.com/organizations/new)
2. Choose **Free** (sufficient for classroom use)
3. Name it something like `your-school-arduino-2025`
4. Add yourself as an owner

> 💡 **GitHub Education**: Apply at [education.github.com](https://education.github.com/) for free Team-tier benefits.

---

## Step 2 — Fork or Import This Template

1. Click **"Use this template"** → **"Create a new repository"**
2. Set the **Owner** to your organization
3. Name it `arduino-classes`
4. Set visibility to **Public** (required for free GitHub Pages)
5. Click **"Create repository from template"**

Then in your new repo:
- Go to **Settings → General** → check **"Template repository"**
- Go to **Settings → Pages** → Source: **GitHub Actions**

---

## Step 3 — Connect to GitHub Classroom

1. Go to [classroom.github.com](https://classroom.github.com/) and sign in
2. Click **"New classroom"** → select your organization
3. Click **"New assignment"**:
   - **Title**: `Module 01 — Welcome to Arduino`
   - **Visibility**: Private
   - **Starter code**: Select `arduino-classes`
   - **Deadline**: Set your date
4. Under **"Grading and feedback"**:
   - Enable **"Enable feedback pull requests"**
   - The `classroom.yml` workflow runs automatically ✅
5. Click **"Create assignment"** → copy the **Invitation Link**

---

## Step 4 — Customize for Your Class

### Update CODEOWNERS
Edit `.github/CODEOWNERS` — replace with your org slug:
```
/curriculum-master/  @your-school-arduino-2025/instructors
```

### Create Teams in Your Org
- `instructors` — add yourself and any co-teachers
- `experts` — promote Path C students here

### Set Branch Protection
Settings → Branches → Add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (select: `AutoGrading`)
- ✅ Require 1 approval before merging

---

## Step 5 — Distribute to Students

Share the **Invitation Link** from GitHub Classroom. When students click it:
1. Creates a private `module-01-{student-name}` repo in your org
2. Copies all template files including Arduino starter sketches
3. Triggers `deploy-pages.yml` → course site is live in ~2 minutes

---

## 🤖 AI-Powered Features (Built-In, Free)

Sensai Classes uses [GitHub Models](https://docs.github.com/en/github-models) — GitHub's built-in AI inference API.

### Generate Arduino Modules with AI

1. Go to **Actions** tab → **"🤖 Generate Arduino Module"**
2. Fill in topic (e.g., "Soil Moisture Sensor"), module number, difficulty
3. Wait ~30 seconds — a draft PR appears with the generated module
4. Review, edit, merge

### Customize AI Behavior

All AI prompts are in `.github/prompts/`:

| File | What It Controls |
|------|-----------------|
| `generate-module.prompt.yml` | How Arduino modules are structured |
| `explain-test-failure.prompt.yml` | How sketch errors are explained |
| `generate-quiz.prompt.yml` | What quiz questions are asked |
| `review-guide.prompt.yml` | Review guidance for PRs |

### Automatic Student-Facing AI

| Feature | When | What Students See |
|---------|------|------------------|
| **Error explainer** | Failed push | PR comment: plain-English explanation + fix |
| **Bonus quiz** | Passing push | PR comment: 3 Arduino challenge questions |
| **Review facilitator** | New PR | Tailored review guidance |

---

## 🤖 Sensai Integration (Arduino Uno Q)

If students have **Arduino Uno Q** boards with Sensai installed:

- Sensai compiles and uploads sketches directly from the terminal
- Students can ask Sensai to explain concepts, debug code, and write sketches
- See the [Sensai Integration Guide](../../curriculum/docs/sensai-integration-guide.md) for classroom strategies

---

## 📊 Monitoring Progress

| Tool | What It Shows |
|------|--------------|
| GitHub Classroom Dashboard | Who accepted, scores, submission status |
| Pull Request labels | `needs-peer-review`, `contract-approved` |
| Actions tab | Full AutoGrader log with test output |
| Webapp Dashboard | Visual student progress across all modules |

---

## 📋 Launch Checklist

- [ ] GitHub Organization created
- [ ] `arduino-classes` repo created from this template
- [ ] Repo marked as "Template repository"
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] GitHub Classroom connected
- [ ] Assignment created with template as starter code
- [ ] CODEOWNERS updated
- [ ] Branch protection rules set
- [ ] Invitation link shared with students
- [ ] *(Optional)* Run "🤖 Generate Arduino Module" for additional modules
- [ ] *(Optional)* Run "🎨 Generate Course Website" for a branded landing page

---

## ❓ FAQ

**Q: Do students need to pay for GitHub?**  
A: No. GitHub Free is sufficient.

**Q: Do students need an Arduino board?**  
A: The GitHub-based autograding works without hardware (it validates sketch structure). For hands-on labs, students need an Arduino Uno Q or compatible board.

**Q: Can I use this without GitHub Classroom?**  
A: Yes! Students can manually fork the template.

**Q: Do the AI features cost anything?**  
A: No. GitHub Models free tier is included with every GitHub account.

**Q: What about Sensai?**  
A: Sensai runs locally on the Uno Q board and is optional. The GitHub-based workflows work independently.
