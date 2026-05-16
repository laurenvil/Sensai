# config.py — Central configuration for the Study Llama web app
#
# All settings point to LOCAL services — no cloud accounts needed.
# Students can modify these values to match their setup.

import os

# ── llama-server Connection ───────────────────────────────────────────
# This is the same server students started in Module 2.
# The /v1 prefix gives us OpenAI-compatible endpoints.
LLAMA_SERVER_URL = os.environ.get("LLAMA_SERVER_URL", "http://localhost:8080/v1")
LLAMA_API_KEY = os.environ.get("LLAMA_API_KEY", "sk-no-key-required")

# ── Database ──────────────────────────────────────────────────────────
# SQLite runs locally with zero setup — it's built into Python.
DATABASE_PATH = os.environ.get("DATABASE_PATH", "study_buddy.db")

# ── ChromaDB (Vector Store) ──────────────────────────────────────────
# ChromaDB stores vector embeddings on disk for semantic search.
CHROMA_PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", "./chroma_data")

# ── File Uploads ─────────────────────────────────────────────────────
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "./uploads")
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB max file size

# ── Flask ────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY", "openfrontier-dev-key-change-in-production")
DEBUG = os.environ.get("FLASK_DEBUG", "true").lower() == "true"

# ── AI Settings ──────────────────────────────────────────────────────
# Temperature for classification and extraction tasks (low = factual)
AI_TEMPERATURE = 0.2
# Model name (llama-server ignores this, but the openai library requires it)
AI_MODEL = "local-model"
