# Walkthrough — gitClasses AI Infrastructure (All Phases Complete)

## Overview

The entire AI-native integration plan from `ai_native_analysis.md` is now fully implemented using GitHub Models + `actions/ai-inference@v1`. No external dependencies, no API keys, no cost.

---

## Final Architecture

```
.github/
├── prompts/                                    ← 6 teacher-editable AI prompt templates
│   ├── generate-module.prompt.yml              ← Generates complete modules
│   ├── generate-pages-site.prompt.yml          ← Generates course website
│   ├── explain-test-failure.prompt.yml         ← Explains test failures
│   ├── generate-quiz.prompt.yml                ← Generates bonus quiz from student code
│   ├── review-guide.prompt.yml                 ← Generates PR review guidance
│   └── generate-contract-curriculum.prompt.yml ← Generates personalized learning guide
├── workflows/
│   ├── generate-module.yml                     ← workflow_dispatch: AI module generator
│   ├── generate-pages.yml                      ← workflow_dispatch: AI Pages site generator
│   ├── classroom.yml                           ← On push: AutoGrader + failure explainer + bonus quiz
│   ├── ai-peer-review.yml                      ← On PR: dynamic review guidance
│   ├── contract-curriculum.yml                 ← On "Approved" comment: personalized curriculum
│   ├── deploy-pages.yml                        ← Auto-deploy to GitHub Pages
│   └── peer-review.yml                         ← Static peer review instructions
└── CODEOWNERS                                  ← Now requires review for prompts/ changes
```

---

## Phase-by-Phase Completion Status

### Phase 1 — Foundation (commit ccb609e)
| Item | Status |
|------|--------|
| Fix Agentic.md | ✅ Rewrote for GitHub Models |
| Build .devcontainer | ✅ Cleaned, OpenMAIC removed |
| Module generator | ✅ `generate-module.yml` replaces `generate-module.sh` |

### Phase 2 — Pages + Student Workflows (commit ccb609e)
| Item | Status |
|------|--------|
| HTML/Pages export pipeline | ✅ `generate-pages.yml` generates full course website |
| Path D (AI Audit) | ❌ Intentionally dropped — AI is invisible infrastructure |

### Phase 3 — Peer Review + Infrastructure (commit ccb609e)
| Item | Status |
|------|--------|
| Docker/self-hosted infrastructure | ❌ Not needed — GitHub Models replaces self-hosting |
| AI peer review bot | ✅ `ai-peer-review.yml` uses `actions/ai-inference` |

### Phase 4 — Dynamic Quiz + Student Prompts (commits 9d054e5, f7053aa)
| Item | Status |
|------|--------|
| Dynamic AI quiz generation | ✅ `classroom.yml` generates 3 bonus questions on success |
| Learning Contract → AI curriculum | ✅ `contract-curriculum.yml` triggers on teacher approval |
| Path C prompt contribution | ✅ Documented in all module READMEs, curriculum README, Agentic.md |
| CODEOWNERS for prompts | ✅ Requires expert + instructor review for prompt changes |

---

## What Each AI Feature Does

### Teacher-Triggered (Manual)

| Feature | Trigger | Output |
|---------|---------|--------|
| **Module Generator** | Actions → "🤖 Generate AI Module" | Draft PR with README, starter code, tests, resources |
| **Pages Site Generator** | Actions → "🎨 Generate Course Website" | Draft PR with premium `index.html` |

### Student-Facing (Automatic)

| Feature | Trigger | Output |
|---------|---------|--------|
| **Test Failure Explainer** | `git push` with failing tests | PR comment: plain-English explanation + suggested fix |
| **Bonus Quiz Generator** | `git push` with passing tests | PR comment: 3 multiple-choice questions from student's code |
| **Review Facilitator** | PR opened | PR comment: tailored guidance for submitter + reviewer |
| **Contract Curriculum** | Teacher comments "Approved" on Learning Contract issue | Issue comment: personalized learning guide with steps, resources, milestones |

---

## Integration 4: Learning Contract → AI Curriculum (New)

The `contract-curriculum.yml` workflow:

1. **Trigger:** Teacher comments "Approved" (case-insensitive) on an issue labeled `contract-pending`
2. **Guard:** Only fires when commenter ≠ issue author (prevents self-approval)
3. **Parse:** Extracts student name, chosen path, module, learning goals, and project idea from the issue body
4. **Generate:** Sends parsed data to `generate-contract-curriculum.prompt.yml` via `actions/ai-inference`
5. **Post:** Posts the personalized curriculum as an issue comment
6. **Label swap:** Removes `contract-pending`, adds `contract-approved`

---

## Gap Closure Summary

| Original Gap | Resolution |
|-------------|-----------|
| Dynamic AI quiz generation | `generate-quiz.prompt.yml` + classroom.yml success steps |
| Learning Contract auto-curriculum | `contract-curriculum.yml` + `generate-contract-curriculum.prompt.yml` |
| Path C prompt contribution docs | Updated in module-01, module-02, curriculum README, Agentic.md, TEACHER_SETUP.md, CODEOWNERS |

**All phases from `ai_native_analysis.md` are now either implemented or intentionally dropped (Path D, Docker infrastructure).**

---

## Commits

| Commit | Description |
|--------|-------------|
| `ccb609e` | Phase 1-3: Replace OpenMAIC with GitHub Models, 4 prompts, 2 new workflows |
| `9d054e5` | Phase 4 files: quiz prompt, contract prompt, contract workflow, curriculum docs, CODEOWNERS |
| `f7053aa` | Phase 4 documentation: updated all doc tables with new prompts/workflows |

---

## Validation

- All 11 YAML files pass `yaml.safe_load()` validation
- Zero external dependencies
- Zero API keys required
- Free for all GitHub accounts (150 req/day on gpt-4o-mini)
