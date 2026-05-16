# 📚 Module 02 — Branching, Merging & Collaborative Workflows

> **Estimated Time:** 3–5 hours  
> **AutoGrader:** Enabled — tests run on every `git push`  
> **Prerequisite:** Module 01 AutoGrader must be passing ✅

---

## 🎯 Learning Objectives

By the end of this module, you will be able to:

1. Create and switch between feature branches
2. Resolve a merge conflict
3. Use `git rebase` to keep a clean commit history
4. Review and approve a teammate's Pull Request with constructive feedback
5. Understand CI/CD: what happens between "push" and "deployed"

---

## 🛤️ Choose Your Path

### Path A — Guided 📖
1. **Read** `resources.md` — the branching strategy explainer (20 min)
2. **Create** a feature branch: `git checkout -b feature/your-name`
3. **Edit** `starter-code/calculator.py` — implement `add()` and `subtract()`
4. **Intentionally create a conflict**: merge `main` into your branch and resolve it
5. **Push** your branch and open a Pull Request — fill out the PR template

### Path B — Explorer 🚀
Build a project that requires collaboration:
- A shared knowledge base where each student edits a different file on their own branch
- A CLI tool where each function lives on its own feature branch
- A collaborative blog where articles are written on branches

### Path C — Expert 🧠
Improve the curriculum or the AI that powers it:
- Add a new test case to `test_calculator.py`
- Write a better branching strategy guide for `resources.md`
- Create a "conflict resolution" exercise file for future students
- **Improve the AI prompts:** Edit `.github/prompts/*.prompt.yml` to make test failure explanations clearer, review guidance more specific, or module generation more structured — then submit a PR

---

## 🤖 AutoGrader — What's Being Tested

| Test | Points | What To Do |
|------|--------|-----------|
| `test_add_function` | 40 pts | Implement `add(a, b)` in `starter-code/calculator.py` |
| `test_subtract_function` | 40 pts | Implement `subtract(a, b)` in `starter-code/calculator.py` |
| `test_branch_exists` | 20 pts | Your PR must come from a feature branch (not `main`) |

**Total: 100 points**

---

## 🔗 Resources

See [resources.md](./resources.md) for videos, docs, and tools.
