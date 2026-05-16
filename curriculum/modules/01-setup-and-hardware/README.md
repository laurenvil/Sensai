# Module 1: Setup & Hardware 🛠️

> **Goal:** Clone a C++ repository, compile it from source, and download an AI model — just like a real frontier lab.

---

## 🧠 The Frontier Lab Connection

Frontier labs like OpenAI and Anthropic don't download pre-built installers. They **compile custom software** optimized for their specific GPU hardware (NVIDIA H100s, Google TPUs). We're going to do the exact same thing — build `llama-server` from its raw C++ source code so it runs as fast as possible on *your* machine.

> [!NOTE]
> **Why C++?** AI inference is all about speed. C++ gives the compiler direct access to your CPU and GPU instructions, which makes the AI generate words faster. Python is great for *calling* the AI, but the engine underneath is always C or C++.

---

## Step 1: Install Prerequisites

Before we build anything, make sure you have these tools installed:

### All Platforms
- **[Git](https://git-scm.com/downloads)** — to download the source code
- **[Python 3.10+](https://www.python.org/downloads/)** — we'll need this in later modules

### Windows
Install **one** of the following C++ build environments:

| Option | Best For | Install Link |
|--------|----------|-------------|
| Visual Studio Build Tools | Most Windows users | [Download](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| MinGW-w64 + CMake | Lightweight setup | [CMake](https://cmake.org/download/) + [MinGW](https://www.mingw-w64.org/) |

> [!TIP]
> When installing Visual Studio Build Tools, check **"Desktop development with C++"** in the installer. That's all you need.

### macOS
Install Xcode Command Line Tools (if you haven't already):
```bash
xcode-select --install
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install build-essential cmake git
```

---

## Step 2: Clone the Repository

Open your terminal (PowerShell on Windows, Terminal on Mac/Linux) and download the `llama.cpp` source code:

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
```

> **What just happened?** `git clone` downloaded every file from the llama.cpp project — over 500,000 lines of C++ code — onto your computer. This is the same workflow that engineers at any tech company use every day.

---

## Step 3: Compile the C++ Project

Computers don't understand C++. They understand **machine code** — raw binary instructions. "Compiling" is the process of translating human-readable C++ into machine code your processor can execute.

### macOS / Linux

```bash
make llama-server -j$(nproc)
```

> The `-j$(nproc)` flag tells `make` to use all your CPU cores for a faster build. On an M-series Mac, this also automatically enables **Metal** GPU acceleration!

### Windows (PowerShell)

```powershell
cmake -B build
cmake --build build --config Release -t llama-server
```

### ✅ Verify the Build

After compilation, verify the binary exists:

**macOS / Linux:**
```bash
./llama-server --help
```

**Windows:**
```powershell
.\build\bin\Release\llama-server.exe --help
```

You should see a wall of command-line options. That means it worked! 🎉

---

## Step 4: Download a "Brain" (The GGUF Model)

An AI model is a massive file of numbers — the "weights" that the neural network learned during training. `llama.cpp` uses a special file format called **GGUF** that is optimized for fast loading.

### What is GGUF?

| Concept | Explanation |
|---------|-------------|
| **GGUF Format** | A binary file format that supports `mmap` (memory mapping), so the server can "load" a 4GB model almost instantly |
| **Quantization (Q4, Q5, Q8)** | Compression that reduces model size by storing numbers with less precision. `Q4_K_M` uses 4-bit numbers instead of 16-bit, cutting size by ~75% |
| **Parameters** | The number of "knobs" the model learned during training. More parameters = smarter but slower and larger |

### Download Steps

1. Go to [Hugging Face](https://huggingface.co) — it's like the "GitHub for AI models"
2. Search for: **`Llama-3.2-3B-Instruct-GGUF`**
3. Download the file ending in **`Q4_K_M.gguf`** (~2 GB)
4. Create a `models` folder inside `llama.cpp` and move the file there:

```bash
mkdir -p models
# Move or copy your downloaded .gguf file into this folder
```

> [!IMPORTANT]
> The model filename matters! You'll reference it by name in the next module. Rename it to something simple if needed, like `llama-3.2-3b.gguf`.

---

## ✅ Module 1 Checkpoint

Before moving on, verify you have:

- [ ] Cloned the `llama.cpp` repository
- [ ] Successfully compiled `llama-server` (the `--help` command works)
- [ ] Downloaded a GGUF model file into the `models/` folder

---

## 🔬 Deep Dive: Why This Matters

When OpenAI serves GPT-4, they don't run a single binary on one laptop. But the *core engine* is similar:

```
Your laptop:     Source Code (.cpp) → Compile → Binary → Load GGUF → Serve
OpenAI's cloud:  Source Code (.cu)  → Compile → Binary → Load Weights → Serve (x10,000 GPUs)
```

The difference is **scale**, not **mechanics**. You just built the same type of engine they use — yours just has one cylinder instead of ten thousand.

---

**➡️ Next: [Module 2 — The OpenAI API Wrapper](../02-openai-api-wrapper/)**
