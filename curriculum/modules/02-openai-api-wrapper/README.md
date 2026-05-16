# Module 2: The OpenAI API Wrapper 🔌

> **Goal:** Start `llama-server`, then use the *exact same* Python code you'd use for ChatGPT to talk to your local machine.

---

## 🧠 The Frontier Lab Connection

Every time you use ChatGPT, your message is sent as an HTTP request to `api.openai.com`. The server reads your message, feeds it into the model, generates a response, and streams it back.

`llama-server` does **the exact same thing** — but instead of sending your request across the internet to OpenAI's data center, it stays on `localhost` (your own computer). The best part? It speaks the same "language" (API format) as OpenAI, so you can use the same Python library without changing a single line of logic.

```
ChatGPT path:    Your Python code → Internet → api.openai.com → GPT-4 → Response
Your path:       Your Python code → localhost → llama-server   → Llama → Response
```

---

## Step 1: Start the Server

Open a terminal inside your `llama.cpp` folder and start `llama-server`, pointing it to the model you downloaded in Module 1.

### macOS / Linux
```bash
./llama-server -m models/llama-3.2-3b.gguf --port 8080
```

### Windows (PowerShell)
```powershell
.\build\bin\Release\llama-server.exe -m models\llama-3.2-3b.gguf --port 8080
```

### What You Should See

Your terminal will fill with log output like this:

```
llama_model_load: loaded meta data with 24 key-value pairs...
...
server is listening on http://127.0.0.1:8080
```

> [!IMPORTANT]
> **Keep this terminal window open!** The server runs until you close it or press `Ctrl+C`. You'll need a **second** terminal window for the Python steps below.

---

## Step 2: Explore the Web UI

Before writing code, open your browser and go to:

**http://localhost:8080**

You'll see `llama-server`'s built-in chat interface! Try typing a question. Watch your server terminal — you'll see the CPU/GPU doing real-time math as tokens are generated.

> This is exactly what happens when you use ChatGPT, except OpenAI's UI is prettier and their servers have a lot more horsepower.

---

## Step 3: Install the Python Library

Open a **new** terminal (keep the server running in the first one) and install the OpenAI Python library:

```bash
pip install openai
```

> Yes, we're installing the *OpenAI* library to talk to *our own* server. That's the whole trick!

---

## Step 4: The Python Hack

Create a file called `test_api.py` (or use the one in this module's `code/` folder):

```python
# test_api.py
from openai import OpenAI

# 💡 THE MAGIC TRICK
# Instead of pointing to api.openai.com, we point to our local server.
# The api_key can be anything — our server doesn't charge money!
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="sk-no-key-required"
)

# This is the EXACT same code you would write for ChatGPT.
# The only difference is the base_url above.
response = client.chat.completions.create(
    model="local-model",  # llama-server ignores this name — it uses whatever GGUF is loaded
    messages=[
        {"role": "system", "content": "You are a helpful, funny assistant."},
        {"role": "user", "content": "Explain black holes in one sentence."}
    ]
)

print(response.choices[0].message.content)
```

### Run It

```bash
cd modules/02-openai-api-wrapper/code
python test_api.py
```

Watch your `llama-server` terminal — you'll see tokens being processed in real-time, and the answer will appear in your Python terminal. **No internet required.**

---

## Step 5: Understanding the API Format

The OpenAI Chat Completions API uses a specific JSON structure. Here's what's happening under the hood:

### What Python Sends (HTTP POST)
```json
{
    "model": "local-model",
    "messages": [
        {"role": "system", "content": "You are a helpful, funny assistant."},
        {"role": "user", "content": "Explain black holes in one sentence."}
    ]
}
```

### What the Server Returns (HTTP Response)
```json
{
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "A black hole is where gravity got so intense it forgot to let light leave the party."
            }
        }
    ]
}
```

### The Three Roles

| Role | Purpose | Who Writes It |
|------|---------|---------------|
| `system` | Sets the AI's personality and rules | You (the developer) |
| `user` | The human's message | The end-user |
| `assistant` | The AI's response | The model |

---

## 🧪 Exercises

1. **Change the system prompt** — Make the AI respond like a pirate. What changes?
2. **Try multiple messages** — Add a follow-up question. What happens when you send the conversation history?
3. **Break it on purpose** — Stop the server (`Ctrl+C`) and run `test_api.py` again. What error do you get? This is what happens when OpenAI has an outage!

---

## ✅ Module 2 Checkpoint

Before moving on, verify:

- [ ] `llama-server` is running and you can see logs in the terminal
- [ ] You visited `http://localhost:8080` and chatted in the browser
- [ ] `python test_api.py` returned a response from your local model
- [ ] You understand that `base_url` is the only thing that changes between local and cloud AI

---

**⬅️ Previous: [Module 1 — Setup & Hardware](../01-setup-and-hardware/)** | **➡️ Next: [Module 3 — Prompting & Inference](../03-prompting-and-inference/)**
