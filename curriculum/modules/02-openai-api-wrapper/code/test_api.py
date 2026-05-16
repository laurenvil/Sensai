# test_api.py — Module 2: First Contact with Your Local AI
#
# This script demonstrates that the OpenAI Python library can talk to
# llama-server without any modification. The only change is base_url.
#
# Usage:
#   1. Make sure llama-server is running (see Module 2 README)
#   2. pip install openai
#   3. python test_api.py

from openai import OpenAI

# ── Configuration ──────────────────────────────────────────────────────
# Point the OpenAI client at your LOCAL server instead of api.openai.com.
# The api_key can be any string — llama-server doesn't require a real key.
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="sk-no-key-required"
)

# ── Send a Chat Completion Request ────────────────────────────────────
# This is the EXACT same code you would write for ChatGPT.
# The "model" field is required by the library but llama-server ignores it —
# it always uses whatever GGUF file you loaded at startup.
response = client.chat.completions.create(
    model="local-model",
    messages=[
        {
            "role": "system",
            "content": "You are a helpful, funny assistant for high school students."
        },
        {
            "role": "user",
            "content": "Explain black holes in one sentence."
        }
    ]
)

# ── Print the Response ────────────────────────────────────────────────
print("🤖 AI says:", response.choices[0].message.content)
