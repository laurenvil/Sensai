# study_buddy_agent.py — Module 4: Your Local AI Study Buddy
#
# A command-line AI agent that:
#   - Connects to your local llama-server
#   - Reads your notes from a text file
#   - Answers questions using ONLY your notes
#   - Generates flashcards with the /flashcards command
#   - Remembers conversation context (follow-up questions work!)
#
# Usage:
#   1. Make sure llama-server is running on port 8080 (see Module 2)
#   2. pip install openai
#   3. python study_buddy_agent.py
#
# Commands:
#   /flashcards  — Generate 3 study flashcards from your notes
#   quit         — Exit the Study Buddy

import os
from openai import OpenAI

# ── Configuration ──────────────────────────────────────────────────────
# Connect to your local llama-server. The API key can be any string
# because the local server doesn't require authentication.
client = OpenAI(base_url="http://localhost:8080/v1", api_key="sk-local")

NOTES_FILE = "history_notes.txt"


def setup_sample_notes():
    """Creates a sample notes file if one doesn't exist so the script
    runs out of the box without any setup."""
    if not os.path.exists(NOTES_FILE):
        with open(NOTES_FILE, "w") as file:
            file.write(
                "The Industrial Revolution began in Great Britain in the "
                "late 18th century. It marked a shift from hand-production "
                "methods to machines, new chemical manufacturing, and iron "
                "production processes. Coal became the primary fuel source.\n\n"
                "Key inventions included the spinning jenny (1764), the "
                "steam engine improvements by James Watt (1769), and the "
                "power loom (1785). These inventions transformed textile "
                "manufacturing and transportation.\n\n"
                "The Industrial Revolution led to urbanization as workers "
                "moved from rural farms to cities for factory jobs. Working "
                "conditions were often harsh, with long hours, low pay, "
                "and child labor being common."
            )
        print(f"📝 Created sample '{NOTES_FILE}' for testing.")


def load_notes():
    """Reads the local notes file and returns its contents."""
    try:
        with open(NOTES_FILE, "r") as file:
            return file.read()
    except FileNotFoundError:
        return "No notes found. Please create a notes file."


def chat_with_agent():
    """Main agent loop — the core of the Study Buddy."""
    print("=" * 60)
    print("🤖 Study Buddy Online!")
    print("   Type your questions below.")
    print("   Commands: /flashcards | quit")
    print("=" * 60)

    # ── Setup ──────────────────────────────────────────────────────
    setup_sample_notes()
    notes_content = load_notes()

    # ── 1. The System Prompt: Define the Agent's Brain ─────────────
    # This constrains the AI to only use our notes — just like how
    # frontier labs use system prompts to control model behavior.
    system_instructions = f"""You are a helpful high school study assistant. 
Your job is to help the student understand and memorize the material in 
their notes. Follow these rules:
1. Only answer questions using the notes provided below.
2. If the student asks something not covered in the notes, say so clearly.
3. Use simple, clear language appropriate for a high school student.
4. When generating flashcards, format them with clear Q: and A: labels.

STUDENT'S NOTES:
{notes_content}"""

    # ── 2. The Context Window: Conversation Memory ─────────────────
    # LLMs are stateless — they forget everything after each response.
    # We simulate "memory" by keeping a list of all messages and
    # sending the ENTIRE list with every request.
    conversation_history = [
        {"role": "system", "content": system_instructions}
    ]

    # ── 3. The Agent Loop ──────────────────────────────────────────
    while True:
        user_input = input("\nYou: ").strip()

        # Exit condition
        if user_input.lower() == "quit":
            print("\n🤖 Good luck on your test!")
            break

        # Skip empty input
        if not user_input:
            continue

        # ── Agent Logic: Intercept slash commands ──────────────────
        # This is the "agent" part — we apply logic BEFORE sending
        # the message to the AI. Real AI agents do the same thing
        # with tool selection, web search, code execution, etc.
        if user_input.lower() == "/flashcards":
            prompt = (
                "Generate 3 question-and-answer flashcards based ONLY "
                "on the notes provided. Format each flashcard clearly "
                "with 📝 Flashcard N, Q:, and A: labels."
            )
        else:
            prompt = user_input

        # Add the user's message to the conversation history
        conversation_history.append({"role": "user", "content": prompt})

        try:
            # ── Call the local server ──────────────────────────────
            # We send the ENTIRE conversation_history list so the AI
            # can see all previous messages (simulating memory).
            response = client.chat.completions.create(
                model="local-model",  # llama-server ignores this
                messages=conversation_history,
                temperature=0.3  # Low = more factual and consistent
            )

            ai_response = response.choices[0].message.content
            print(f"\nStudy Buddy: {ai_response}")

            # Add the AI's response to history so it "remembers"
            # what it just said for follow-up questions
            conversation_history.append(
                {"role": "assistant", "content": ai_response}
            )

        except Exception as e:
            print(f"\n⚠️  Error connecting to server: {e}")
            print(
                "Make sure your llama-server is running in another "
                "terminal on port 8080!"
            )


if __name__ == "__main__":
    chat_with_agent()
