# app.py — Flask web server for the Study Llama web application
#
# This is the main entry point. It replaces:
#   - frontend/main.go          (Go Fiber server setup, routes, middleware)
#   - frontend/handlers/handlers.go  (all HTTP request handlers)
#
# Run with: python app.py
# Then open: http://localhost:5000

import os
import json
from functools import wraps
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash, jsonify
)
from werkzeug.utils import secure_filename

import config
import database
import ai_engine
import vector_store

# ── Create the Flask App ──────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

# Initialize the database on startup
database.init_db()


# ── Auth Helpers ──────────────────────────────────────────────────────
# Replaces: frontend/auth/auth.go (AuthorizeGet, AuthorizePost)

def login_required(f):
    """Decorator that redirects to login if user is not authenticated.
    This replaces Go's auth.AuthorizeGet() / auth.AuthorizePost()."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "username" not in session:
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated_function


def get_current_user():
    """Get the currently logged-in username, or None."""
    return session.get("username")


# ── Auth Routes ───────────────────────────────────────────────────────
# Replaces: HandleLogin, HandleSignUp, HandleLogout, LoginRoute, SignUpRoute

@app.route("/")
def home():
    """Home page. Replaces: HomeRoute in handlers.go"""
    return render_template("home.html", authenticated="username" in session)


@app.route("/login", methods=["GET", "POST"])
def login_page():
    """Login page and handler. Replaces: LoginRoute + HandleLogin"""
    if request.method == "GET":
        return render_template("login.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if not username or not password:
        flash("Please fill in all fields.", "error")
        return render_template("partials/status_banner.html", error="Please fill in all fields.")

    if database.verify_user(username, password):
        session["username"] = username
        # HTMX redirect (same pattern as Go's HX-Redirect header)
        response = app.make_response("")
        response.headers["HX-Redirect"] = url_for("categories_page")
        return response
    else:
        return render_template("partials/status_banner.html", error="Invalid username or password.")


@app.route("/signup", methods=["GET", "POST"])
def signup_page():
    """Signup page and handler. Replaces: SignUpRoute + HandleSignUp"""
    if request.method == "GET":
        return render_template("signup.html")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    password_repeat = request.form.get("passwordRepeat", "")

    if not username or not password:
        return render_template("partials/status_banner.html", error="Please fill in all fields.")

    if password != password_repeat:
        return render_template("partials/status_banner.html", error="Passwords do not match.")

    if database.create_user(username, password):
        return render_template("partials/status_banner.html", success="Account created! You can now log in.")
    else:
        return render_template("partials/status_banner.html", error="Username already exists.")


@app.route("/logout", methods=["POST"])
def logout():
    """Logout handler. Replaces: HandleLogout"""
    session.clear()
    response = app.make_response("")
    response.headers["HX-Redirect"] = url_for("home")
    return response


# ── Categories Routes ─────────────────────────────────────────────────
# Replaces: CategoriesRoute, HandleCreateRule, HandleUpdateRule, HandleDeleteRule
# Note: The original called these "rules" — we renamed to "categories"
# because that's more intuitive for students.

@app.route("/categories", methods=["GET"])
@login_required
def categories_page():
    """Categories page. Replaces: CategoriesRoute"""
    username = get_current_user()
    categories = database.get_categories(username)
    return render_template("categories.html",
                           username=username,
                           categories=categories,
                           authenticated=True)


@app.route("/categories", methods=["POST"])
@login_required
def create_category():
    """Create a category. Replaces: HandleCreateRule"""
    username = get_current_user()
    name = request.form.get("rule_name", "").strip()
    type_ = request.form.get("rule_type", "").strip()
    description = request.form.get("rule_description", "").strip()

    if not name or not type_ or not description:
        return render_template("partials/status_banner.html", error="All fields are required.")

    database.create_category(username, name, type_, description)
    categories = database.get_categories(username)
    return render_template("partials/categories_list.html", categories=categories)


@app.route("/categories/<int:category_id>", methods=["DELETE"])
@login_required
def delete_category(category_id):
    """Delete a category. Replaces: HandleDeleteRule"""
    username = get_current_user()
    database.delete_category(category_id)
    categories = database.get_categories(username)
    return render_template("partials/categories_list.html", categories=categories)


# ── Notes Routes ──────────────────────────────────────────────────────
# Replaces: FilesRoute, HandleUploadFile, HandleDeleteFile

@app.route("/notes", methods=["GET"])
@login_required
def notes_page():
    """Notes page. Replaces: FilesRoute"""
    username = get_current_user()
    notes = database.get_notes(username)
    return render_template("notes.html",
                           notes=notes,
                           authenticated=True)


@app.route("/notes", methods=["POST"])
@login_required
def upload_note():
    """Upload, classify, extract, and index a note.

    Replaces: HandleUploadFile in handlers.go
    This is the BIG handler — it orchestrates the full pipeline:
      1. Save the uploaded file
      2. Classify it using llama-server (replaces LlamaClassify)
      3. Extract summary + FAQs using llama-server (replaces LlamaExtract)
      4. Store vectors in ChromaDB (replaces Qdrant upload)
      5. Save metadata in SQLite (replaces PostgreSQL insert)
    """
    username = get_current_user()

    # 1. Save the uploaded file
    file = request.files.get("upload_file")
    if not file or file.filename == "":
        return render_template("partials/status_banner.html", error="No file selected.")

    filename = secure_filename(file.filename)
    filepath = os.path.join(config.UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Read the file content
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text_content = f.read()
    except Exception as e:
        return render_template("partials/status_banner.html",
                               error=f"Could not read file: {e}")

    # 2. Classify the note (replaces agent.ProcessFile → LlamaClassify)
    categories = database.get_categories(username)
    category_list = [
        {"name": c["name"], "type": c["type"], "description": c["description"]}
        for c in categories
    ]

    category = None
    if category_list:
        try:
            category = ai_engine.classify_note(text_content, category_list)
        except Exception:
            category = None  # Classification is optional

    # 3. Extract summary + FAQs (replaces LlamaExtract)
    summary = ""
    faqs = []
    try:
        extracted = ai_engine.extract_study_notes(text_content)
        summary = extracted.get("summary", "")
        faqs = extracted.get("faqs", [])
    except Exception:
        summary = text_content[:300]  # Fallback to first 300 chars

    # 4. Store in vector database (replaces Qdrant upload)
    try:
        if summary:
            vector_store.store_summary(summary, username, category, filename)
        if faqs:
            questions = [faq.get("question", "") for faq in faqs]
            answers = [faq.get("answer", "") for faq in faqs]
            vector_store.store_faqs(questions, answers, username, category, filename)
    except Exception:
        pass  # Vector storage is optional — don't block the upload

    # 5. Save to database
    database.create_note(username, filename, category, summary)

    # Return updated notes list (HTMX partial)
    notes = database.get_notes(username)
    return render_template("partials/notes_list.html", notes=notes)


@app.route("/notes/<int:note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):
    """Delete a note. Replaces: HandleDeleteFile"""
    username = get_current_user()

    # Get the note info before deleting
    notes = database.get_notes(username)
    note_to_delete = next((n for n in notes if n["id"] == note_id), None)

    if note_to_delete:
        # Remove vectors from ChromaDB
        vector_store.delete_by_file(note_to_delete["file_name"], username)
        # Remove file from disk
        filepath = os.path.join(config.UPLOAD_FOLDER, note_to_delete["file_name"])
        if os.path.exists(filepath):
            os.remove(filepath)

    database.delete_note(note_id)
    notes = database.get_notes(username)
    return render_template("partials/notes_list.html", notes=notes)


# ── Search Routes ─────────────────────────────────────────────────────
# Replaces: SearchRoute, HandleSearch

@app.route("/search", methods=["GET"])
@login_required
def search_page():
    """Search page. Replaces: SearchRoute"""
    username = get_current_user()
    categories = database.get_categories(username)
    notes = database.get_notes(username)
    return render_template("search.html",
                           categories=categories,
                           notes=notes,
                           authenticated=True)


@app.route("/search", methods=["POST"])
@login_required
def handle_search():
    """Execute a vector search. Replaces: HandleSearch + agent.ProcessSearch"""
    username = get_current_user()
    search_type = request.form.get("search_type", "summaries")
    search_input = request.form.get("search_input", "").strip()
    category = request.form.get("category", "").strip() or None
    file_name = request.form.get("file_name", "").strip() or None

    if not search_input:
        return render_template("partials/status_banner.html", error="Please enter a search query.")

    if search_type == "faqs":
        results = vector_store.search_faqs(search_input, username, category, file_name)
    else:
        results = vector_store.search_summaries(search_input, username, category, file_name)

    return render_template("partials/search_results.html", results=results)


# ── Chat Routes ───────────────────────────────────────────────────────
# Replaces: The CLI agent from Module 4

@app.route("/chat", methods=["GET"])
@login_required
def chat_index():
    """Chat list / new chat interface for the Study Buddy."""
    username = get_current_user()
    chat_sessions = database.get_chat_sessions(username)
    return render_template("chat.html", 
                           chat_sessions=chat_sessions,
                           current_session_id=None,
                           chat_history=[],
                           authenticated=True)

@app.route("/chat/<int:session_id>", methods=["GET"])
@login_required
def chat_page(session_id):
    """Load a specific chat session."""
    username = get_current_user()
    chat_sessions = database.get_chat_sessions(username)
    
    session_data = database.get_chat_session(session_id)
    if not session_data or session_data["username"] != username:
        return redirect(url_for("chat_index"))
        
    chat_history = json.loads(session_data["history_json"])
    
    return render_template("chat.html", 
                           chat_sessions=chat_sessions,
                           current_session_id=session_id,
                           chat_history=chat_history,
                           authenticated=True)

@app.route("/chat", methods=["POST"])
@login_required
def handle_chat():
    """Process an incoming chat message."""
    username = get_current_user()
    user_message = request.form.get("message", "").strip()
    session_id = request.form.get("session_id", "").strip()
    
    if not user_message:
        return ""
        
    if session_id:
        session_id = int(session_id)
        session_data = database.get_chat_session(session_id)
        if not session_data or session_data["username"] != username:
            return "Unauthorized", 403
        chat_history = json.loads(session_data["history_json"])
    else:
        chat_history = []
        
    # Get user's notes to build context
    notes = database.get_notes(username)
    context = ""
    if notes:
        # We'll just append the summaries to give the AI context about their notes
        summaries = [f"- {n['file_name']}: {n['summary']}" for n in notes if n['summary']]
        context = "User's uploaded notes:\n" + "\n".join(summaries)
        
    # Generate AI response
    ai_response = ai_engine.chat_with_study_buddy(
        user_message, 
        chat_history, 
        notes_context=context
    )
    
    # Save to history
    chat_history.append({"role": "user", "content": user_message})
    chat_history.append({"role": "assistant", "content": ai_response})
    history_json = json.dumps(chat_history)
    
    if session_id:
        # Update existing session
        database.update_chat_session(session_id, history_json)
        # Render the new messages (both user and AI) as partials
        return render_template("partials/chat_message.html", 
                               user_msg=user_message, 
                               ai_msg=ai_response)
    else:
        # Create new session
        title = user_message[:30] + "..." if len(user_message) > 30 else user_message
        new_session_id = database.create_chat_session(username, title, history_json)
        # Redirect to the new chat session page
        response = app.make_response("")
        response.headers["HX-Redirect"] = url_for("chat_page", session_id=new_session_id)
        return response

@app.route("/chat/<int:session_id>", methods=["DELETE"])
@login_required
def delete_chat(session_id):
    """Delete a chat session."""
    username = get_current_user()
    session_data = database.get_chat_session(session_id)
    if session_data and session_data["username"] == username:
        database.delete_chat_session(session_id)
        
    # Redirect back to the chat index
    response = app.make_response("")
    response.headers["HX-Redirect"] = url_for("chat_index")
    return response


# ── Error Handlers ────────────────────────────────────────────────────
# Replaces: PageDoesNotExistRoute, Page500, AuthFailedPage

@app.errorhandler(404)
def page_not_found(e):
    return render_template("home.html", authenticated="username" in session,
                           error="Page not found"), 404


@app.errorhandler(500)
def internal_error(e):
    return render_template("home.html", authenticated="username" in session,
                           error="Something went wrong"), 500


# ── Run the App ───────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Study Llama -- Local AI Study Companion")
    print("  Open: http://localhost:5000")
    print("  Make sure llama-server is running on port 8080!")
    print("=" * 60)
    app.run(debug=config.DEBUG, port=5000)
