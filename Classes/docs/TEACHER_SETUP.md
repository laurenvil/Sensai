# 🍎 Teacher Setup Guide

> Everything you need to launch your Open Classroom on GitHub — from zero to students coding in under 30 minutes.

---

## Overview

The gitClasses framework uses three GitHub tools working together:

```
GitHub Organization          ← Your "school building"
  └── GitHub Classroom       ← Your "gradebook & assignment manager"
        └── This Template    ← Your "course materials"
              └── GitHub Pages ← Your "classroom website" (auto-deployed)
```

---

## Step 1 — Create a GitHub Organization

A GitHub Organization is the container for all student repositories.

1. Go to [github.com/organizations/new](https://github.com/organizations/new)
2. Choose **Free** (sufficient for classroom use)
3. Name it something like `your-school-cs-2025`
4. Add yourself as an owner

> 💡 **GitHub Education**: If you have a verified `.edu` email, apply at [education.github.com](https://education.github.com/) for free Team-tier benefits for your org.

---

## Step 2 — Fork or Import This Template

1. Click **"Use this template"** (button at top of this repo) → **"Create a new repository"**
2. Set the **Owner** to your organization (not your personal account)
3. Name it `curriculum-master`
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
   - **Title**: `Module 01 — Git Basics`
   - **Visibility**: Private (each student gets their own private repo)
   - **Starter code**: Search for and select `curriculum-master`
   - **Deadline**: Set your date
4. Under **"Grading and feedback"**:
   - Enable **"Enable feedback pull requests"**
   - The `classroom.yml` workflow will run automatically ✅
5. Click **"Create assignment"** → copy the **Invitation Link**

---

## Step 4 — Customize for Your Class

### Update CODEOWNERS
Edit `.github/CODEOWNERS` — replace `your-org` with your actual organization slug:
```
/curriculum-master/  @your-school-cs-2025/instructors
```

### Create Teams in Your Org
- `instructors` — add yourself and any co-teachers
- `experts` — promote Path C students here as they advance

### Set Branch Protection
In your template repo → **Settings → Branches → Add rule** for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (select: `AutoGrading`)
- ✅ Require 1 approval before merging

---

## Step 5 — Distribute to Students

Share the **Invitation Link** from GitHub Classroom.

When students click it, GitHub automatically:
1. Creates a private `module-01-{student-name}` repo in your org
2. Copies all template files into it
3. Triggers the `deploy-pages.yml` workflow → their course site is live in ~2 minutes

---

## 🤖 AI-Powered Features (Built-In, Free)

gitClasses uses [GitHub Models](https://docs.github.com/en/github-models) — GitHub's built-in AI inference API — to power all AI features. No external services, no API keys, no cost.

### For Teachers: Generate Modules with AI

Instead of writing lesson content from scratch, describe a topic and AI generates a complete module:

1. Go to **Actions** tab → click **"🤖 Generate AI Module"**
2. Click **"Run workflow"**
3. Fill in:
   - **Topic:** e.g., "Introduction to Python Functions"
   - **Module Number:** e.g., "03"
   - **Difficulty:** beginner / intermediate / advanced
4. Wait ~30 seconds — a **draft PR** appears with the generated module
5. Review the content, make any edits, then merge

The AI generates: `README.md`, `starter-code/app.py`, `tests/test_module.py`, and `resources.md`.

### For Teachers: Generate the Course Website

1. Go to **Actions** → **"🎨 Generate Course Website"**
2. Click **"Run workflow"**, fill in course title and description
3. A draft PR appears with a modern, responsive `index.html`
4. Review, merge → site auto-deploys to GitHub Pages

### Customize AI Behavior

All AI prompts are plain YAML files in `.github/prompts/`:

| File | What It Controls |
|------|-----------------|
| `generate-module.prompt.yml` | How modules are structured and written |
| `generate-pages-site.prompt.yml` | How the course website looks and what sections it includes |
| `explain-test-failure.prompt.yml` | How test failures are explained to students |
| `generate-quiz.prompt.yml` | What bonus quiz questions are asked when tests pass |
| `review-guide.prompt.yml` | What reviewers are asked to look for in PRs |
| `generate-contract-curriculum.prompt.yml` | How personalized learning guides are structured for approved Learning Contracts |

Edit these directly in the GitHub web editor — changes take effect immediately.

> 🧠 **Path C students** can also submit PRs to improve these prompts — see the [Curriculum Overview](../curriculum-master/README.md).

### Automatic Student-Facing AI

These features work automatically — no teacher action required:

| Feature | When It Runs | What Students See |
|---------|-------------|-------------------|
| **Test failure explainer** | Every failed `git push` | PR comment: plain-English explanation + suggested fix |
| **Bonus quiz generator** | Every passing `git push` | PR comment: 3 bonus challenge questions from their code |
| **Review facilitator** | Every new PR | PR comment: tailored review guidance for both submitter and reviewer |
| **Contract curriculum** | Teacher comments "Approved" on a Learning Contract issue | Issue comment: personalized learning guide with steps, resources, and milestones |

### Rate Limits

GitHub Models free tier provides 150 requests/day on `gpt-4o-mini` — enough for a class of 30 students. See [GitHub Models docs](https://docs.github.com/en/github-models) for current limits.

---

## 📊 Monitoring Progress

| Tool | What It Shows |
|------|--------------|
| [GitHub Classroom Dashboard](https://classroom.github.com/) | Who accepted, AutoGrader scores, submission status |
| Org → Repositories | All student repos at a glance |
| Pull Request labels | `needs-peer-review` = waiting on peers, `contract-approved` = ready to work |
| Actions tab (any student repo) | Full AutoGrader log with test output |

### Downloading Grades
GitHub Classroom Dashboard → your assignment → **"Download grades"** → CSV  
Columns: Student name, GitHub username, repo URL, points earned, submission timestamp.

---

## 🔧 Autograding Configuration

The tests in `curriculum-master/modules/module-01-basics/tests/test_basics.py` are pre-configured.

To add or modify tests:
1. Edit the test file
2. Commit to `main` in `curriculum-master`
3. Students' repos will pick up changes on their next push

> ⚠️ If you change point values, update `.github/workflows/classroom.yml` `max-score` accordingly.

---

## 📋 Launch Checklist

- [ ] GitHub Organization created
- [ ] `curriculum-master` repo created from this template
- [ ] Repo marked as "Template repository" in Settings
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] GitHub Classroom connected to your org
- [ ] Assignment created with `curriculum-master` as starter code
- [ ] Autograding enabled in assignment settings
- [ ] CODEOWNERS updated with your org slug
- [ ] Branch protection rules set on `main`
- [ ] Invitation link shared with students
- [ ] *(Optional)* Run "🤖 Generate AI Module" to create additional modules
- [ ] *(Optional)* Run "🎨 Generate Course Website" for a branded landing page

---

## ❓ FAQ

**Q: Do students need to pay for GitHub?**  
A: No. GitHub Free is sufficient. Students with a `.edu` email can get GitHub Pro free via [education.github.com](https://education.github.com/students).

**Q: What if a student accidentally pushes to `main`?**  
A: Branch protection will block the push. They'll see an error explaining they need to create a feature branch.

**Q: Can I use this without GitHub Classroom?**  
A: Yes! Students can manually fork the template. You lose the centralized gradebook but keep all other features.

**Q: How do I add a new module manually?**  
A: Copy `module-01-basics/` → rename it → update `curriculum-master/README.md` module map → update `classroom.yml` to include the new tests. Or use the **"🤖 Generate AI Module"** workflow.

**Q: Do the AI features cost anything?**  
A: No. GitHub Models free tier is included with every GitHub account. It provides 150 requests/day on `gpt-4o-mini`, which is sufficient for most classrooms.

**Q: Can I change what the AI generates?**  
A: Yes! Edit the `.prompt.yml` files in `.github/prompts/`. They're plain YAML — change the system instructions, add constraints, or adjust the output format.

**Q: Do I need API keys for the AI features?**  
A: No. All AI features use the built-in `GITHUB_TOKEN` that every workflow already has. No external API keys needed.

