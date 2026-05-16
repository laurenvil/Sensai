# Gemini Project Instructions

## Project Overview

**OpenFrontier** is a GitHub-based curriculum that teaches high school students how `llama-server` (from `llama.cpp`) is a "micro-version" of what happens at frontier AI labs like OpenAI and Anthropic. Students progress through 5 hands-on modules — from compiling C++ source code to shipping a full-stack AI web application — entirely on their own hardware with no cloud accounts required.

## Repository Structure

```
OpenFrontier/
├── README.md                          ← Public landing page (badges, objectives, module links)
├── LICENSE                            ← MIT
├── .gitignore
├── docs/
│   ├── llamaFrontier.md               ← Technical comparison: llama-server vs. frontier labs
│   ├── hardware-recommendations.md    ← Classroom hardware guide
│   └── walkthrough.md                 ← Internal dev notes (gitignored)
├── modules/
│   ├── 01-setup-and-hardware/         ← Clone, compile, download GGUF model
│   ├── 02-openai-api-wrapper/         ← Start server, connect with Python openai library
│   ├── 03-prompting-and-inference/    ← Context windows, temperature, simple RAG
│   ├── 04-practical-application/      ← CLI Agent: AI Study Buddy
│   └── 05-demo-day/                   ← 🎓 Full-stack capstone: Flask + ChromaDB + HTMX
├── assets/
│   └── architecture-diagram.md        ← Mermaid diagrams
├── llamaCourse.md                     ← Original curriculum draft (reference only)
├── llamaFrontier.md                   ← Original frontier comparison (reference only)
└── build_curriculum.py                ← Legacy scaffold script (reference only)
```

### Module Layout Convention

Each module follows this pattern:

```
modules/NN-module-name/
├── README.md          ← Lesson content (renders on GitHub)
└── code/              ← Working Python scripts + data files
    ├── script.py
    ├── sample_data.txt
    └── requirements.txt
```

## Audience & Tone

- **Target audience:** High school students (ages 14–18) with basic Python knowledge
- **Tone:** Conversational, encouraging, and energetic — avoid jargon without explanation
- **Every technical term** must be defined on first use (e.g., "quantization", "context window", "token")
- **Use analogies** to make concepts stick (e.g., "the KV Cache is like the AI's short-term memory desk")
- Use emoji sparingly for section headers and checkpoints (🛠️ 🔌 🧠 🚀 ✅)

## Writing Conventions

### Module READMEs

Each module README should include these sections in order:

1. **Title + one-line goal** — What the student will accomplish
2. **🧠 The Frontier Lab Connection** — How this concept maps to OpenAI/Anthropic
3. **Step-by-step instructions** — Numbered, with platform-specific tabs (macOS/Linux vs. Windows)
4. **Exercises / Challenges** — Hands-on tasks with expandable `<details>` hints
5. **✅ Checkpoint** — Checkbox list of what students should verify before moving on
6. **Navigation links** — Previous / Next module links

### Code Style

- All Python scripts must be **fully commented** explaining every concept
- Use the `openai` Python library pointed at `localhost:8080`
- Always use `api_key="sk-no-key-required"` or similar placeholder
- The `model` parameter can be any string (llama-server ignores it)
- Default port is `8080`; default temperature for study tasks is `0.3`

### Markdown

- Use **GitHub Flavored Markdown** — tables, task lists, alerts, fenced code blocks
- Use Mermaid diagrams for architecture/flow visualizations
- Use `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` alerts for callouts
- Keep lines and bullet points concise for readability on mobile

## Key Technical Details

### Stack

| Layer | Technology |
|-------|-----------|
| Inference engine | `llama.cpp` / `llama-server` (C++) |
| Model format | GGUF (quantized, memory-mapped) |
| API compatibility | OpenAI Chat Completions (`/v1/chat/completions`) |
| Client library | Python `openai>=1.0.0` |
| Recommended model | `Llama-3.2-3B-Instruct` in `Q4_K_M` quantization |
| Web framework (Module 5) | Flask (Python) |
| Vector database (Module 5) | ChromaDB (local, in-process) |
| Frontend UI (Module 5) | Jinja2 + HTMX + DaisyUI |
| Relational database (Module 5) | SQLite (built into Python) |

### Core Concepts Taught

1. **Compilation** — `cmake`/`make` from C++ source
2. **GGUF + Quantization** — How models are stored and compressed
3. **OpenAI API Compatibility** — `base_url` swap is the only change
4. **Context Windows** — Stateless inference, conversation history as a list
5. **Temperature** — Controlling creativity vs. factuality
6. **Prompt Engineering** — System prompts to constrain behavior
7. **Simple RAG** — Injecting file contents into the system prompt
8. **Agent Pattern** — `while True` loop with command interception
9. **Full-stack Web Apps** — Flask routes, Jinja2 templates, HTMX dynamic UIs
10. **Vector Databases** — ChromaDB for semantic search over embeddings
11. **AI Pipelines** — Classify → Extract → Embed → Search workflows
12. **Entrepreneurship** — Pricing models, user research, Demo Day pitches

## Do's and Don'ts

### Do

- Frame every lesson as "you are doing what OpenAI does, just smaller"
- Include working code that runs immediately after server startup
- Provide platform-specific instructions for Windows, macOS, and Linux
- Keep Modules 1–4 completable in a single class period (~45–60 minutes)
- Module 5 (Demo Day) is a multi-session project — no time constraints
- Reference `docs/llamaFrontier.md` for deeper technical context

### Don't

- Assume students have admin/root access — avoid `sudo` where possible
- Require cloud accounts, API keys, or paid services
- Use unexplained jargon — define every term
- Make modules dependent on external services that could go offline
- Put model files (`.gguf`) in the repository — they're gitignored
