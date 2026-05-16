# Module 5: Demo Day — Refactoring study-llama into OpenFrontier

## Goal

Create a **Module 5: Demo Day** that refactors the [run-llama/study-llama](https://github.com/run-llama/study-llama) project into our OpenFrontier curriculum. This module is an unconstrained capstone where students build a full-stack "frontier lab" — a web application backed by their local `llama-server` — and learn entrepreneurship skills by shipping a real product.

## Background: What study-llama Is

study-llama is a production-grade note-organizing app with:
- **Go frontend** (Fiber web framework, Templ templates, HTMX, DaisyUI/TailwindCSS)
- **Python backend** (LlamaCloud workflows for classification, extraction, vector search)
- **Cloud dependencies**: OpenAI API, LlamaCloud (LlamaClassify, LlamaExtract), Qdrant Cloud, PostgreSQL, Docker deployment

> [!CAUTION]
> **The original study-llama violates our core constraint: "No cloud accounts or API keys required."** It depends on OpenAI API keys, LlamaCloud API keys, Qdrant Cloud, and PostgreSQL hosting. Every one of these must be replaced with local alternatives powered by `llama-server`.

---

## User Review Required

> [!IMPORTANT]
> **Major Architecture Decision: Replace Go + Cloud with Python + Local**
> 
> The original study-llama uses **Go** for the web frontend and **LlamaCloud** for all AI processing. High school students won't have Go experience, and LlamaCloud requires paid API keys. I propose replacing the entire stack with **Python-only** technologies that run locally. This is a significant departure from the original codebase — it's a functional port, not a line-by-line copy.

> [!IMPORTANT]
> **Frontend Technology Choice**
> 
> The original uses Go + Templ + HTMX + DaisyUI. I propose replacing with **Flask + Jinja2 + HTMX + DaisyUI** (via CDN). This keeps the same dynamic HTMX interaction pattern but uses Python, which students already know from Modules 1–4. 
> 
> **Alternative**: We could use a simple HTML/JS frontend with a FastAPI backend. Let me know if you prefer this.

> [!WARNING]
> **Vector Database Replacement**
> 
> The original uses Qdrant Cloud. I propose replacing with **ChromaDB** (runs locally in-process, no server needed, `pip install chromadb`). This means the vector search will work identically but with zero setup. The trade-off is that ChromaDB is less production-grade, but that's appropriate for a learning environment.

---

## Open Questions

1. **Should we keep the reference clone?** The `reference/study-llama/` directory (36MB with `.git`) is useful for students to compare, but it's large. Should we:
   - (a) Keep it and gitignore it
   - (b) Delete it after the refactor
   - (c) Keep it but remove the `.git` folder to save space

2. **Auth scope**: The original has full user auth (signup, login, sessions, CSRF). For a student project, should we:
   - (a) Include simplified auth (username/password with Flask sessions) — teaches web security basics
   - (b) Skip auth entirely (single-user mode) — simpler, focuses on AI
   - (c) Optional auth as a "Challenge" exercise

3. **SQLite vs. PostgreSQL**: The original uses PostgreSQL. I recommend **SQLite** (zero-setup, built into Python). This aligns with our no-cloud-services philosophy. Acceptable?

4. **Embedding model**: The original uses OpenAI `text-embedding-3-small` for vector embeddings via cloud API. I'll replace this with `llama-server`'s built-in embedding endpoint (`/v1/embeddings`), which can generate embeddings locally using the same GGUF model. Students will need to start the server with the `--embedding` flag. Is this acceptable, or do you prefer a lightweight local embedding library like `sentence-transformers`?

---

## Proposed Changes

### Component-by-Component Refactoring Map

Here's how every piece of the original study-llama maps to our refactored version:

| Original (study-llama) | Refactored (Module 5) | Rationale |
|---|---|---|
| Go + Fiber web server | **Flask** (Python) | Students know Python from Modules 1–4 |
| Templ templates | **Jinja2** templates | Python-native, same concept |
| HTMX + DaisyUI | **HTMX + DaisyUI** (kept) | Great student-friendly stack, no change needed |
| LlamaCloud LlamaClassify | **llama-server** prompt-based classification | Local, free, uses skills from Module 3 |
| LlamaCloud LlamaExtract | **llama-server** structured extraction via prompts | Local, free, uses skills from Module 3 |
| OpenAI embeddings API | **llama-server** `/v1/embeddings` endpoint | Local, same API format |
| Qdrant Cloud vector DB | **ChromaDB** (local) | `pip install`, zero config |
| PostgreSQL (cloud) | **SQLite** (local) | Built into Python, zero setup |
| Docker deployment | **`python app.py`** | No Docker needed for local dev |
| LlamaAgents workflows | **Simple Python functions** | Demystifies the workflow concept |

---

### Module 5 Directory Structure

#### [NEW] `modules/05-demo-day/`

```
modules/05-demo-day/
├── README.md                          ← Main module guide (multi-week project)
├── reference/
│   └── study-llama/                   ← Cloned original (gitignored)
└── code/
    ├── requirements.txt               ← Flask, chromadb, openai, jinja2
    ├── app.py                         ← Flask web server (replaces Go main.go)
    ├── config.py                      ← Configuration constants
    ├── database.py                    ← SQLite setup + queries (replaces PostgreSQL)
    ├── ai_engine.py                   ← llama-server client: classify, extract, embed
    ├── vector_store.py                ← ChromaDB wrapper (replaces Qdrant vectordb.py)
    ├── templates/
    │   ├── base.html                  ← Base layout with DaisyUI + HTMX
    │   ├── home.html                  ← Landing page (replaces home.templ)
    │   ├── notes.html                 ← Upload & manage notes (replaces notes.templ)
    │   ├── categories.html            ← Create/manage categories (replaces rules.templ)
    │   ├── search.html                ← Semantic search (replaces search.templ)
    │   ├── login.html                 ← Sign in page (replaces signin.templ)
    │   ├── signup.html                ← Sign up page (replaces signup.templ)
    │   └── partials/
    │       ├── navbar.html            ← Navigation bar
    │       ├── footer.html            ← Footer
    │       ├── status_banner.html     ← HTMX status responses
    │       ├── notes_list.html        ← HTMX partial for notes table
    │       ├── categories_list.html   ← HTMX partial for categories table
    │       └── search_results.html    ← HTMX partial for search results
    ├── static/
    │   └── images/                    ← Hero images, error pages
    └── sample_notes/
        ├── biology_notes.txt          ← Pre-loaded sample data
        ├── history_notes.txt          ← Pre-loaded sample data
        └── physics_notes.txt          ← Pre-loaded sample data
```

---

### File-by-File Details

#### [NEW] [README.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/README.md)
The main module guide covering:
- **🧠 The Frontier Lab Connection** — "You built the engine (Module 1–4). Now you're building the entire company: product, UI, infrastructure."
- **Phase 1: The Backend** — Setting up Flask, SQLite, ChromaDB
- **Phase 2: The AI Engine** — Connecting to llama-server for classification, extraction, and embeddings
- **Phase 3: The Web Frontend** — Building the UI with Jinja2, HTMX, and DaisyUI
- **Phase 4: Demo Day Prep** — Polish, present, and pitch your product
- **Entrepreneurship Challenges** — Pricing exercise, user research, pitch deck

---

#### [NEW] [app.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/app.py)
**Replaces**: `frontend/main.go` + `frontend/handlers/handlers.go`

Flask web server with routes mirroring the original:

| Original Go Route | New Flask Route | Handler |
|---|---|---|
| `GET /` | `GET /` | Home page |
| `POST /login` | `POST /login` | Login handler |
| `POST /register` | `POST /register` | Registration handler |
| `POST /logout` | `POST /logout` | Logout handler |
| `GET /categories` | `GET /categories` | Categories page |
| `POST /rules` | `POST /categories` | Create category |
| `DELETE /rules/:id` | `DELETE /categories/<id>` | Delete category |
| `GET /notes` | `GET /notes` | Notes page |
| `POST /notes` | `POST /notes` | Upload + classify + extract note |
| `DELETE /notes/:id` | `DELETE /notes/<id>` | Delete note |
| `GET /review` | `GET /search` | Search page |
| `POST /review` | `POST /search` | Execute vector search |

Key refactoring details:
- Go's Fiber middleware (cache, rate-limit, CORS) → Flask equivalents or removed (not needed for local)
- Go's cookie-based auth → Flask session-based auth
- Go's `agent.ProcessFile()` → Direct call to `ai_engine.classify_and_extract()`
- Go's `agent.ProcessSearch()` → Direct call to `vector_store.search()`

---

#### [NEW] [config.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/config.py)
Central configuration:
```python
LLAMA_SERVER_URL = "http://localhost:8080/v1"
LLAMA_API_KEY = "sk-no-key-required"
DATABASE_PATH = "study_buddy.db"
CHROMA_PERSIST_DIR = "./chroma_data"
UPLOAD_FOLDER = "./uploads"
```

---

#### [NEW] [database.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/database.py)
**Replaces**: All SQL schemas + `filesdb/`, `rulesdb/`, `authdb/` (both Go and Python)

Single-file SQLite database with three tables:
- `users` (id, username, password_hash) — replaces `schema.auth.sql`
- `categories` (id, username, name, type, description) — replaces `schema.rules.sql`
- `notes` (id, username, file_name, category, uploaded_at) — replaces `schema.files.sql`

Uses Python's built-in `sqlite3` module — zero dependencies.

---

#### [NEW] [ai_engine.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/ai_engine.py)
**Replaces**: `classify_and_extract/workflow.py` + `classify_and_extract/resources.py` + `classify_and_extract/models.py` + `classify_and_extract/events.py` + `classify_and_extract/utils.py`

This is the heart of the refactor. The original uses LlamaCloud's proprietary LlamaClassify and LlamaExtract services. We replace them with **direct llama-server calls**:

| Original Cloud Service | Local Replacement |
|---|---|
| `LlamaClassify.aclassify_file_ids()` | Prompt: "Given these categories: [...]. Classify this text: [...]" via `/v1/chat/completions` |
| `LlamaExtract` with `StudyNotes` schema | Prompt: "Extract a summary and FAQs from this text. Return JSON..." via `/v1/chat/completions` with `response_format={"type": "json_object"}` |
| `OpenAIEmbedder.embed()` via cloud API | Same `openai` library pointed at `localhost:8080/v1/embeddings` |

Functions:
- `classify_note(text, categories)` → Returns category string
- `extract_study_notes(text)` → Returns `{"summary": "...", "faqs": [{"q": "...", "a": "..."}]}`
- `generate_embeddings(texts)` → Returns list of float vectors

---

#### [NEW] [vector_store.py](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/modules/05-demo-day/code/vector_store.py)
**Replaces**: `vectordb/vectordb.py` + `vectordb/embeddings.py` + `search/workflow.py` + `search/events.py` + `search/resources.py` + `scripts/create_qdrant_collections.py`

ChromaDB wrapper with the same interface as the original `SummaryVectorDB` and `FaqsVectorDB`:
- `store_summary(summary, metadata)` — replaces `SummaryVectorDB.upload()`
- `store_faqs(questions, answers, metadata)` — replaces `FaqsVectorDB.upload()`
- `search_summaries(query, filters)` — replaces `SummaryVectorDB.search()`
- `search_faqs(query, filters)` — replaces `FaqsVectorDB.search()`

ChromaDB auto-creates collections, so no setup script needed (replaces `scripts/create_qdrant_collections.py`).

---

#### [NEW] Templates: `templates/*.html`
**Replaces**: All `.templ` and `_templ.go` files in `frontend/templates/`

| Original Templ File | New Jinja2 File | Notes |
|---|---|---|
| `home.templ` | `home.html` | Same hero layout, DaisyUI classes preserved |
| `navbar.templ` | `partials/navbar.html` | Same nav links, auth-aware |
| `footer.templ` | `partials/footer.html` | Simplified footer |
| `rules.templ` | `categories.html` | Renamed "rules" → "categories" for students |
| `notes.templ` | `notes.html` | File upload form + notes table |
| `search.templ` | `search.html` | Search form with filters + results |
| `signin.templ` | `login.html` | Login form |
| `signup.templ` | `signup.html` | Registration form |
| `statusBanner.templ` | `partials/status_banner.html` | HTMX success/error banners |
| `404.templ` / `500.templ` / `unauthorized.templ` | Handled by Flask error handlers | Simplified |

All templates will use the same **HTMX + DaisyUI** pattern from the original, preserving the dynamic, SPA-like interaction model.

---

### Supporting Files

#### [MODIFY] [README.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/README.md)
Add Module 5 to the modules table in the root README.

#### [MODIFY] [.gitignore](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/.gitignore)
Add entries for:
- `modules/05-demo-day/reference/` (cloned study-llama)
- `modules/05-demo-day/code/chroma_data/` (ChromaDB persistence)
- `modules/05-demo-day/code/uploads/` (uploaded files)
- `modules/05-demo-day/code/*.db` (SQLite databases)

#### [MODIFY] [GEMINI.md](file:///c:/Users/Teacher/Development/Firm%20AI/GitBio/OpenFrontier/GEMINI.md)
Add Module 5 to the project structure and document the new stack (Flask, ChromaDB, SQLite).

---

## Verification Plan

### Automated Tests
1. **Flask app starts**: `python app.py` launches without errors on port 5000
2. **Database creation**: SQLite tables are created on first run
3. **AI engine**: `ai_engine.py` functions return expected JSON when llama-server is running
4. **Vector store**: ChromaDB stores and retrieves documents correctly
5. **Full flow**: Upload a sample note → auto-classify → extract summary/FAQs → search returns results

### Manual Verification
1. Open `http://localhost:5000` in a browser — home page renders with DaisyUI styling
2. Create a category → upload a note → verify it appears in the notes list
3. Search for a term from the uploaded note → verify relevant results appear
4. All HTMX interactions work without full page reloads

### Browser Testing
- Navigate through all pages (home, categories, notes, search)
- Verify HTMX partials load correctly
- Test the upload flow end-to-end
