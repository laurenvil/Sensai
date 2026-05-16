# Walkthrough: Module 5 — Demo Day (study-llama Refactor)

## What Was Done

Refactored [run-llama/study-llama](https://github.com/run-llama/study-llama) — a Go + LlamaCloud web app — into a fully local, Python-only **Module 5: Demo Day** capstone for the OpenFrontier curriculum.

## Architecture Mapping

| Original (study-llama) | Refactored (Module 5) |
|---|---|
| Go + Fiber web server | **Flask** (Python) |
| Templ templates (Go) | **Jinja2** templates |
| HTMX + DaisyUI | HTMX + DaisyUI *(kept)* |
| LlamaCloud LlamaClassify | **llama-server** prompt-based classification |
| LlamaCloud LlamaExtract | **llama-server** structured JSON extraction |
| OpenAI cloud embeddings | **llama-server** `/v1/embeddings` (with ChromaDB fallback) |
| Qdrant Cloud vector DB | **ChromaDB** (local, in-process) |
| PostgreSQL (cloud) | **SQLite** (built into Python) |
| Docker + cloud deployment | **`python app.py`** |

## Files Created (25 new files)

### Core Backend (4 files)
- [config.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/config.py) — Central configuration
- [database.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/database.py) — SQLite (users, categories, notes, chat_sessions)
- [ai_engine.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/ai_engine.py) — llama-server AI client + Web Study Buddy agent logic
- [vector_store.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/vector_store.py) — ChromaDB vector search

### Flask App (1 file)
- [app.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/app.py) — 333-line Flask server (replaces 555 lines of Go)

### Templates (12 files)
- [base.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/base.html) — Base layout (DaisyUI + HTMX + Alpine.js)
- [home.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/home.html) — Landing page with hero + steps
- [login.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/login.html) — HTMX login form
- [signup.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/signup.html) — HTMX registration form
- [categories.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/categories.html) — Category management
- [notes.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/notes.html) — Note upload + list
- [search.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/search.html) — Semantic search with filters
- [chat.html](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/templates/chat.html) — Web interface for the Study Buddy agent (integrates Module 4 logic with a multi-session sidebar layout)
- `partials/navbar.html`, `footer.html`, `status_banner.html`, `categories_list.html`, `notes_list.html`, `search_results.html`, `chat_message.html`, `chat_sidebar_item.html`

### Content (4 files)
- [README.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/README.md) — Full module guide with architecture, challenges, entrepreneurship
- [biology_notes.txt](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/sample_notes/biology_notes.txt), [history_notes.txt](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/sample_notes/history_notes.txt), [physics_notes.txt](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/sample_notes/physics_notes.txt)

### Config (1 file)
- [requirements.txt](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/requirements.txt)

## Files Modified (4 files)

- [.gitignore](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/.gitignore) — Added Module 5 artifacts (reference/, chroma_data/, uploads/, *.db)
- [README.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/README.md) — Added Module 5 to modules table + directory structure
- [GEMINI.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/GEMINI.md) — Added Module 5 stack, concepts, structure
- [Module 4 README.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/04-practical-application/README.md) — Added forward nav link to Module 5

## Verification — Static

| Test | Result |
|------|--------|
| `pip install` dependencies | ✅ All installed (Flask, ChromaDB, openai, werkzeug) |
| `python app.py` starts | ✅ Flask running on http://127.0.0.1:5000 |
| `GET /` returns 200 | ✅ Home page with Study Llama hero + "How It Works" |
| `GET /login` returns 200 | ✅ Sign In form renders |
| `GET /signup` returns 200 | ✅ Sign Up form renders |
| SQLite database created | ✅ `study_buddy.db` auto-created on startup |
| ChromaDB initialized | ✅ `chroma_data/` directory created |

## Verification — Full Browser Test (End-to-End)

Browser testing performed at `http://localhost:5000` with a live Flask server.

| Page / Flow | Status | Notes |
|---|---|---|
| Home (`/`) | ✅ | Dark theme, Study Llama branding, "How It Works" steps, Sign In + Create Account CTAs |
| Sign Up (`/signup`) | ✅ | Form submits via HTMX, success banner displayed, account created in SQLite |
| Login (`/login`) | ✅ | Auth redirects to `/categories` dashboard after successful login |
| Navbar (authenticated) | ✅ | Categories, Notes, Search, Chat links + Logout button all appear |
| Categories (`/categories`) | ✅ | Add/delete categories work; HTMX partial swaps table without page reload |
| Notes (`/notes`) | ✅ | Upload form present; gracefully handles missing llama-server without crashing |
| Search (`/search`) | ✅ | Query form renders; "No results found" state displays correctly for empty vault |
| Chat (`/chat`) | ✅ | Seamlessly embeds Module 4's CLI agent in the browser. Supports creating multiple distinct chat sessions, tracking conversation history per-session in SQLite, and deleting old chats. Includes a modern two-column UI. |
| Logout | ✅ | Session cleared, redirects to home, navbar reverts to Sign In / Sign Up |

### Bug Fixed During Testing

**Issue:** On the Categories page, if a user immediately submitted a second category without manually clearing the form inputs, the previous values persisted — leading to concatenated names (e.g., `BiologyHistory`).

**Fix:** Added `hx-on::after-request="if(event.detail.successful) this.reset()"` to the add-category `<form>` in `categories.html`. After each successful HTMX POST, the form automatically resets all inputs to empty/placeholder state.

**File changed:** `modules/05-demo-day/code/templates/categories.html`

### What Requires llama-server

The Notes upload AI pipeline (classify → extract → embed) only activates once students have `llama-server` running on port 8080 per Module 1. The app handles its absence gracefully — uploads succeed and store basic metadata; AI enrichment is skipped with no crash.

## Reference Clone

The original study-llama repo is cloned at `modules/05-demo-day/reference/study-llama/` (gitignored) for student comparison.

