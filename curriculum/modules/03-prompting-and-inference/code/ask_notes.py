# ask_notes.py — Module 3: Asking Questions About Your Documents
#
# This script demonstrates "prompt injection" — feeding unstructured text
# data into the AI's context window so it can answer questions about it.
#
# Usage:
#   1. Make sure llama-server is running (see Module 2)
#   2. python ask_notes.py

from openai import OpenAI

client = OpenAI(base_url="http://localhost:8080/v1", api_key="local")

# ── 1. Read the unstructured data ─────────────────────────────────────
with open("biology_notes.txt", "r") as file:
    notes = file.read()

# ── 2. Inject it into the System Prompt ───────────────────────────────
# We constrain the AI to ONLY use our data, not its general training.
# This technique is the foundation of RAG (Retrieval-Augmented Generation).
system_prompt = f"""You are a biology tutor for high school students.
IMPORTANT: Only answer questions using the notes below. If the answer 
is not in the notes, say "I don't see that in your notes."

STUDENT'S NOTES:
{notes}"""

# ── 3. Perform Inference ─────────────────────────────────────────────
response = client.chat.completions.create(
    model="local",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What does photosynthesis need?"}
    ],
    temperature=0.1  # Low temperature = more factual, less creative
)

# ── 4. Display ────────────────────────────────────────────────────────
print("🧬 Tutor says:", response.choices[0].message.content)
