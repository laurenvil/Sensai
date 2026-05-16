# Add Study Buddy Chat to Webapp

## Goal

The original `study-llama` app and our current Module 5 implementation do not have a dedicated chat interface for interacting with the AI agent. Module 4 implemented a command-line "Study Buddy", but the webapp currently only allows for semantic search over notes. 

This plan details how we will bring the Study Buddy agent from Module 4 into the Module 5 webapp as a new, interactive Chat page.

## Proposed Changes

### `app.py`
- Add a new `GET /chat` route to render the chat UI.
- Add a new `POST /chat` route to handle incoming HTMX messages, retrieve conversation history from the Flask `session`, call the AI engine, and return the AI's response via an HTMX partial.
- Update `session` logic to maintain a `chat_history` list for the user.

### `ai_engine.py`
- Create a `chat_with_agent(user_message, history, context="")` function (adapted from Module 4) that combines the system prompt, uploaded notes context (if applicable), and conversation history to query `llama-server`.

### Templates
#### [NEW] `templates/chat.html`
- A full-page chat interface built with DaisyUI (similar to modern chat apps).
- Contains a scrollable message history area and a fixed input bar at the bottom.
- Uses HTMX to submit messages without page reloads.

#### [NEW] `templates/partials/chat_message.html`
- An HTMX partial that renders a single chat bubble (user or assistant). 
- Will be appended to the chat interface dynamically when a message is sent or received.

#### [MODIFY] `templates/partials/navbar.html`
- Add a "Chat" link alongside Categories, Notes, and Search so students can navigate to the Study Buddy.

## Verification Plan

### Automated/Manual Verification
1. Start `app.py`.
2. Navigate to `/chat`.
3. Type a message (e.g., "What are my notes about?" or `/flashcards`) and submit.
4. Verify that HTMX appends the user message immediately, and then appends the AI's response once it returns from the `llama-server`.
5. Ask a follow-up question to verify that the `session`-based conversation history works correctly.

## Update: Persistent Chat History & Multiple Sessions

After the initial chat integration, the ephemeral session cookie storage was replaced with a robust SQLite backend to support multiple ongoing conversations per user.

### Database Architecture
- A new `chat_sessions` table was added via `init_db()` in `database.py`.
- Instead of complex relational mapping for individual messages, the entire conversation array is stringified and stored as `history_json`. This perfectly mimics the prior Flask session structure while persisting data indefinitely.

### UI Enhancements
- The `chat.html` template was overhauled into a two-column DaisyUI layout.
- **Sidebar:** Lists all historical chats using the new `partials/chat_sidebar_item.html` partial, allowing users to quickly switch contexts or start fresh with a "➕ New Chat" button.
- Chat session titles are automatically generated from the first user message.

### Routing Adjustments
- `GET /chat` now acts as an index, loading a blank conversational state and fetching past sessions.
- `GET /chat/<session_id>` seamlessly loads old histories from SQLite into the chat window.
- HTMX handles new session creation via an `HX-Redirect` to the new session ID upon the very first message sent.
