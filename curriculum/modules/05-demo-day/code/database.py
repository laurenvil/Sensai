# database.py — SQLite database for users, categories, and notes
#
# This replaces the PostgreSQL + Go/Python split from the original study-llama.
# SQLite is built into Python — zero setup, zero cloud accounts.
#
# Original files replaced:
#   - frontend/auth/dbops.go + authdb/      → users table
#   - frontend/rules/  + rulesdb/           → categories table
#   - frontend/files/  + filesdb/           → notes table
#   - schema.auth.sql, schema.files.sql, schema.rules.sql

import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
from config import DATABASE_PATH


def get_db():
    """Create a connection to the SQLite database."""
    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row  # Return rows as dictionaries
    return db


def init_db():
    """Create all tables if they don't exist.
    Called once when the app starts."""
    db = get_db()
    db.executescript("""
        -- Users table (replaces schema.auth.sql)
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Categories table (replaces schema.rules.sql / "rules" in the original)
        -- In the original, these were called "rules" — classification rules that
        -- tell the AI how to categorize uploaded notes.
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username)
        );

        -- Notes table (replaces schema.files.sql)
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            file_name TEXT NOT NULL,
            category TEXT,
            summary TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username)
        );

        -- Chat sessions table
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            title TEXT NOT NULL,
            history_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username)
        );
    """)
    db.commit()
    db.close()


# ── User Operations ──────────────────────────────────────────────────
# Replaces: frontend/auth/auth.go + frontend/authdb/

def create_user(username, password):
    """Register a new user. Returns True on success, False if user exists."""
    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, generate_password_hash(password))
        )
        db.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # Username already exists
    finally:
        db.close()


def verify_user(username, password):
    """Check if username/password combination is valid."""
    db = get_db()
    user = db.execute(
        "SELECT password_hash FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    db.close()
    if user is None:
        return False
    return check_password_hash(user["password_hash"], password)


# ── Category Operations ──────────────────────────────────────────────
# Replaces: frontend/rulesdb/ + study_llama/rulesdb/

def create_category(username, name, type_, description):
    """Create a new classification category for a user."""
    db = get_db()
    db.execute(
        "INSERT INTO categories (username, name, type, description) VALUES (?, ?, ?, ?)",
        (username, name, type_, description)
    )
    db.commit()
    db.close()


def get_categories(username):
    """Get all categories for a user."""
    db = get_db()
    categories = db.execute(
        "SELECT * FROM categories WHERE username = ? ORDER BY created_at DESC",
        (username,)
    ).fetchall()
    db.close()
    return categories


def delete_category(category_id):
    """Delete a category by ID."""
    db = get_db()
    db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    db.commit()
    db.close()


# ── Notes Operations ─────────────────────────────────────────────────
# Replaces: frontend/filesdb/ + study_llama/filesdb/

def create_note(username, file_name, category=None, summary=None):
    """Record a new uploaded note."""
    db = get_db()
    db.execute(
        "INSERT INTO notes (username, file_name, category, summary) VALUES (?, ?, ?, ?)",
        (username, file_name, category, summary)
    )
    db.commit()
    db.close()


def get_notes(username):
    """Get all notes for a user."""
    db = get_db()
    notes = db.execute(
        "SELECT * FROM notes WHERE username = ? ORDER BY uploaded_at DESC",
        (username,)
    ).fetchall()
    db.close()
    return notes


def delete_note(note_id):
    """Delete a note by ID."""
    db = get_db()
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    db.commit()
    db.close()


# ── Chat Session Operations ──────────────────────────────────────────

def create_chat_session(username, title, history_json):
    """Record a new chat session."""
    db = get_db()
    cursor = db.execute(
        "INSERT INTO chat_sessions (username, title, history_json) VALUES (?, ?, ?)",
        (username, title, history_json)
    )
    session_id = cursor.lastrowid
    db.commit()
    db.close()
    return session_id


def get_chat_sessions(username):
    """Get all chat sessions for a user, ordered by most recently updated."""
    db = get_db()
    sessions = db.execute(
        "SELECT * FROM chat_sessions WHERE username = ? ORDER BY updated_at DESC",
        (username,)
    ).fetchall()
    db.close()
    return sessions


def get_chat_session(session_id):
    """Get a specific chat session."""
    db = get_db()
    session = db.execute(
        "SELECT * FROM chat_sessions WHERE id = ?",
        (session_id,)
    ).fetchone()
    db.close()
    return session


def update_chat_session(session_id, history_json):
    """Update the history and updated_at timestamp for a chat session."""
    db = get_db()
    db.execute(
        "UPDATE chat_sessions SET history_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (history_json, session_id)
    )
    db.commit()
    db.close()


def delete_chat_session(session_id):
    """Delete a chat session by ID."""
    db = get_db()
    db.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    db.commit()
    db.close()

