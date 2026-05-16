# 🏛️ gitClasses Curriculum Overview

> **The living document of this course** — maintained collaboratively by teachers and Path C Expert students.

---

## 📋 Course Philosophy

This curriculum is built on three principles from the Open Classroom model:

1. **Pull-Based Learning** — Students choose their path. Teachers act as mentors, not lecturers.
2. **Real-World Workflow** — Every concept is taught using the same Git/GitHub tools professionals use daily.
3. **Community-Driven Growth** — You learn faster by teaching others. Expert students shape the curriculum itself.

---

## 🗺️ Module Map

| Module | Topic | AutoGrader | Peer Review |
|--------|-------|-----------|-------------|
| [01 — Basics](./modules/module-01-basics/README.md) | Git fundamentals, first PR, Learning Contract | ✅ | Required |
| [02 — Branching](./modules/module-02-branching/README.md) | Feature branches, merge conflicts, CI/CD | ✅ | Required |
| 03 — CI/CD *(coming soon)* | GitHub Actions, automated testing, deployment | 🔜 | Required |
| 04 — Open Source *(coming soon)* | Forking, upstream sync, contributing to real projects | 🔜 | Required |
| 05 — Capstone *(coming soon)* | End-to-end project from idea to deployed site | 🔜 | Required |

---

## 🤝 Community Resources

Student-contributed resources live in [`community-resources/`](./community-resources/).  
Adding a file here is worth **25 points** on the AutoGrader.

---

## ✏️ Contributing to This Curriculum (Path C)

See the [Curriculum Improvement issue template](../.github/ISSUE_TEMPLATE/curriculum_improvement.md) to propose changes.

All improvements go through the standard PR + peer review process — the same workflow you're learning in the modules.

### What Path C Students Can Contribute

| Contribution Type | Where | Example |
|-------------------|-------|---------|
| Fix a bug or typo | `curriculum-master/modules/` | Correct a broken link in `resources.md` |
| Add a test case | `modules/*/tests/` | Add edge-case coverage to `test_basics.py` |
| Improve resources | `community-resources/` | Add a curated tutorial or cheat sheet |
| **Improve AI prompts** | `.github/prompts/` | Make the AI generate better modules, explain failures more clearly, or give reviewers better guidance |

### How to Contribute to AI Prompts

The AI behavior in gitClasses is controlled by plain YAML files in `.github/prompts/`. Path C students can:

1. Read the current prompt (e.g., `.github/prompts/explain-test-failure.prompt.yml`)
2. Identify an improvement (e.g., "the explanation should include a link to the relevant Python docs")
3. Edit the YAML prompt — change the system instructions or output format
4. Open a PR with your change — explain why the improvement helps students
5. The teacher reviews and merges — the AI behavior updates immediately

---

## 📂 Curriculum Structure

```text
curriculum-master/
├── README.md                  # Course overview & module map (You are here)
├── community-resources/       # Student-contributed resources (graded!)
└── modules/
    ├── module-01-basics/      # Git fundamentals, first PR
    │   ├── README.md
    │   ├── resources.md
    │   ├── starter-code/
    │   └── tests/
    └── module-02-branching/   # Feature branches, merge conflicts
        ├── README.md
        ├── resources.md
        ├── starter-code/
        └── tests/
```
