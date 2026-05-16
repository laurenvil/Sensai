# Module 3: Prompting & Inference 🧠

> **Goal:** Understand context windows, temperature, and how to make an AI answer questions about your own documents.

---

## 🧠 The Frontier Lab Connection

Here's a secret about every AI chatbot you've ever used: **the AI has zero memory.** It doesn't remember your name, your last question, or anything you said 5 minutes ago.

Every single time you send a message to ChatGPT, the software sends the **entire conversation history** back to the AI from scratch. The AI re-reads everything, generates the next response, and immediately forgets again.

The space where all this text fits is called the **Context Window** — and understanding it is the key to making AI actually useful.

---

## Key Concepts

### Context Window

The context window is the maximum amount of text the AI can "see" at once. Think of it like the AI's desk — everything it needs to reference must fit on the desk.

| Model | Context Window | Equivalent To |
|-------|---------------|---------------|
| Llama 3.2 3B | ~8,000 tokens | ~20 pages of text |
| GPT-4 Turbo | ~128,000 tokens | ~300 pages of text |
| Claude 3.5 | ~200,000 tokens | ~500 pages of text |

> **1 token ≈ 0.75 words.** The word "understanding" is 2 tokens. The word "cat" is 1 token.

### Temperature

Temperature controls how "creative" vs. "factual" the AI's responses are:

| Temperature | Behavior | Best For |
|------------|----------|----------|
| `0.0` | Always picks the most likely next word | Facts, math, code |
| `0.3` | Mostly factual with slight variation | Study guides, summaries |
| `0.7` | Balanced creativity | General conversation |
| `1.0+` | Wild and unpredictable | Creative writing, brainstorming |

### The Three Roles (Revisited)

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM: "You are a biology tutor. Only use these       │
│           notes: [your notes here]"                     │  ← You control this
├─────────────────────────────────────────────────────────┤
│  USER: "What does photosynthesis need?"                 │  ← The student types this
├─────────────────────────────────────────────────────────┤
│  ASSISTANT: "Based on the notes, photosynthesis         │
│              requires sunlight, water, and CO₂."        │  ← The AI generates this
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Your Notes File

Create a text file with some study material. We've included a sample `biology_notes.txt` in this module's `code/` folder:

```text
Mitochondria is the powerhouse of the cell. It generates ATP (adenosine 
triphosphate) through cellular respiration.

Photosynthesis requires sunlight, water, and carbon dioxide. It occurs 
in the chloroplasts of plant cells. The chemical equation is:
6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂

DNA stands for deoxyribonucleic acid. It carries the genetic instructions 
for the development and function of living organisms. DNA has a double 
helix structure discovered by Watson and Crick in 1953.

The cell membrane is a phospholipid bilayer that controls what enters 
and exits the cell. It is selectively permeable.
```

---

## Step 2: Ask Questions About Your Notes

Now let's inject those notes into the AI's context window and ask questions:

```python
# ask_notes.py
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8080/v1", api_key="local")

# ── 1. Read the unstructured data ─────────────────────────────────────
with open("biology_notes.txt", "r") as file:
    notes = file.read()

# ── 2. Inject it into the System Prompt ───────────────────────────────
# This is called "prompt engineering" — we're crafting instructions that
# constrain the AI to ONLY use our data, not its general training.
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

print("🧬 Tutor says:", response.choices[0].message.content)
```

### Run It

```bash
cd modules/03-prompting-and-inference/code
python ask_notes.py
```

---

## Step 3: Test the Boundaries

Try these prompts to see how the system prompt constrains the AI:

| Prompt | Expected Behavior |
|--------|-------------------|
| "What does photosynthesis need?" | ✅ Answers from notes |
| "Who discovered DNA's structure?" | ✅ "Watson and Crick in 1953" |
| "What is quantum physics?" | ❌ Should say "not in your notes" |
| "What is the capital of France?" | ❌ Should refuse — it's not in the notes |

> [!TIP]
> If the AI answers questions outside the notes, try making your system prompt stricter. This is the art of **prompt engineering** — and it's a real job at frontier labs!

---

## 🔬 Deep Dive: What is RAG?

What we just did — reading a file and stuffing it into the prompt — is a simplified version of **RAG** (Retrieval-Augmented Generation). Here's how it scales:

```
Our approach (Small Scale):
  Read entire file → Paste into prompt → Ask question

Real RAG (Frontier Scale):
  Split 500 pages into chunks → Store in vector database →
  When user asks a question → Search for 3 most relevant chunks →
  Paste only those chunks into the prompt → Ask question
```

Why? Because a 500-page textbook won't fit in an 8,000-token context window. RAG solves this by only retrieving the **relevant** pieces.

> **The concept is identical — ours just doesn't need a database because our notes are small enough to fit.**

---

## 🧪 Exercises

1. **Swap the notes** — Replace `biology_notes.txt` with your own class notes from any subject. Does the AI answer correctly?
2. **Temperature experiment** — Run the same question with `temperature=0.0` and `temperature=1.0`. Compare the responses. Which is more useful for studying?
3. **Break the context window** — Copy your notes file 50 times to create a huge file. What happens when you try to feed it all to the AI?
4. **Multi-turn conversation** — Modify the script to ask a follow-up question by adding another `user` message to the `messages` list.

---

## ✅ Module 3 Checkpoint

Before moving on, verify:

- [ ] You created a notes file and the AI correctly answers questions from it
- [ ] You tested with questions NOT in the notes — the AI refused (or you improved the prompt until it did)
- [ ] You understand what temperature does
- [ ] You can explain why LLMs are "stateless" (they don't remember previous conversations)

---

**⬅️ Previous: [Module 2 — The OpenAI API Wrapper](../02-openai-api-wrapper/)** | **➡️ Next: [Module 4 — Practical Application](../04-practical-application/)**
