# Hardware Recommendations for Students

This page helps teachers and students choose the right hardware for running `llama-server` in a classroom setting.

---

## Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | Any modern quad-core (Intel i5 / Ryzen 5) | Apple M1/M2/M3 or AMD Ryzen 7 |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 5 GB free | 20 GB free (for multiple models) |
| **GPU** | Not required (CPU inference works fine) | NVIDIA GPU with 6+ GB VRAM |

---

## Model Size Guide

The "brain" you download must fit in your computer's memory. Here's a quick guide:

| Model Size | RAM Needed (Q4 quantized) | Speed on CPU | Example |
|-----------|---------------------------|-------------|---------|
| **1B parameters** | ~1 GB | Fast (15+ tokens/sec) | Llama-3.2-1B-Instruct |
| **3B parameters** | ~2.5 GB | Good (8-12 tokens/sec) | Llama-3.2-3B-Instruct |
| **7B parameters** | ~5 GB | Moderate (3-6 tokens/sec) | Mistral-7B-Instruct |
| **13B parameters** | ~9 GB | Slow (1-3 tokens/sec) | Llama-2-13B-Chat |

> [!TIP]
> **For classroom use, we recommend the 3B model.** It's smart enough for meaningful conversations and fast enough to keep students engaged on most laptops.

---

## Operating System Notes

### Windows
- Requires Visual Studio Build Tools or MinGW for C++ compilation
- CMake is the recommended build system
- Works best with NVIDIA GPUs via CUDA

### macOS
- Apple Silicon (M1/M2/M3/M4) is **excellent** — Metal GPU acceleration is automatic
- Intel Macs work but are slower
- Just type `make` — no extra setup needed

### Linux
- Works out of the box with `make`
- CUDA support available for NVIDIA GPUs
- Excellent for Chromebook users via Linux (Crostini) on higher-end models

---

## Chromebooks

Many schools use Chromebooks. Here's the reality:

| Chromebook Type | Can Run llama-server? | Notes |
|----------------|----------------------|-------|
| Low-end (2-4 GB RAM) | ❌ No | Not enough memory |
| Mid-range (8 GB RAM) | ⚠️ Maybe | Enable Linux (Beta), use 1B model only |
| High-end (16 GB RAM) | ✅ Yes | Works well with 3B model |

> [!IMPORTANT]
> If your classroom only has low-end Chromebooks, consider setting up **one server machine** (a teacher's laptop or a lab desktop) and having students connect to it over the local network. `llama-server` supports this natively — just use `--host 0.0.0.0` when starting the server.
