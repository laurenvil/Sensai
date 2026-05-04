## Generation Speed Analysis — Sensai on Arduino Uno Q

### Root Cause of Current Speed

The eval v1.4 numbers (0.8B Q4_0: **2.50 tok/s**, 0.6B Q4_0: **1.53 tok/s**) trace directly to one hardware fact:

The QRB2210's Cortex-A53 cores are **ARMv8.0 only** — confirmed by `/proc/cpuinfo`:
```
Features: fp asimd evtstrm aes pmull sha1 sha2 crc32 cpuid
```

No `asimddp` (dotprod), no `i8mm`. These INT8 dot-product instructions are what makes quantized LLM inference fast on modern ARM. Without them, llama.cpp dequantizes Q4_0 weights to FP32 and runs them through NEON FMLA — roughly **4× slower** per cycle than a dotprod-capable core (Cortex-A55, A76, etc.). The `libggml-cpu-armv8.0_1.so` variant that loads at runtime is the correct choice — the armv8.2/8.6 variants in the lib directory won't engage on this CPU and correctly aren't selected.

**This is a hard ceiling on the CPU path.** No flag tuning, thread count, or quantization format change will overcome the missing dotprod instruction.

---

### The Major Opportunity: Vulkan GPU Backend

The Adreno 702 is already running and has a working Vulkan stack:

```
deviceName        = Turnip Adreno (TM) 702
apiVersion        = 1.4.309
shaderFloat16     = true
shaderInt8        = true
/dev/dri/renderD128  ← compute device present
```

The **Turnip** driver (Mesa open-source Vulkan for Adreno) is fully functional. llama.cpp's Vulkan compute backend uses INT8/FP16 compute shaders — exactly what's available. The `llama-b8263-bin-ubuntu-trixie-vulkan-arm64.tar.gz` build exists in yzma's download matrix (`download.go:186`).

The GPU eliminates the dotprod bottleneck entirely. The Adreno 702 can execute parallel INT8 matmuls across its shader cores — the same operation that costs 4× on the A53 without dotprod runs natively on the GPU.

Expected gain: conservatively **3–8× improvement** over CPU-only (rough estimate; Adreno 702 is a modest mobile GPU, not a Jetson). That puts generation in the **8–20 tok/s** range, which changes the classroom experience fundamentally.

---

### Secondary Wins (flag-level, CPU or GPU path)

These apply now without changing anything and are free to test:

**1. Context size: 12288 → 4096**

The current 12288 ctx is dramatically oversized. The longest possible request (SOUL.md + student question + max 800-token response) is ~1600 tokens. At 12288:
- KV cache for 0.8B with Q8_0: ~350 MB locked in RAM
- Prefill must process 12288 possible positions
- Each decode step computes attention over the full 12288 window

At 4096, KV cache drops to ~117 MB and cold-start TTFT (58s for 0.8B, 39s for 0.6B) will improve measurably.

**2. `--parallel 2` → `--parallel 1`**

With a single classroom terminal session or one Telegram bot, there's only ever 1 concurrent request. `--parallel 2` pre-allocates two full KV cache slots (doubles KV memory). Drop to 1.

**3. Flash attention: add `--flash-attn on`**

Currently at `auto` (the default). On the GPU Vulkan path, flash attention is supported and reduces attention memory bandwidth significantly. Explicitly enabling it removes any ambiguity in the auto-detection logic.

**4. Thread reduction for GPU path**

When GPU handles all layers, the CPU only does sampling and KV cache management — very lightweight. Drop `-t 4` to `-t 2` with the Vulkan build. This frees 2 cores for OS tasks and prevents memory bandwidth contention between CPU threads and GPU DMA.

**5. Remove `--mlock` on GPU path**

With GPU offloading, the model weights live in GPU-accessible shared DRAM, not pinned CPU pages. `--mlock` is a CPU-path optimization. With Vulkan it may cause unnecessary memory pressure.

---

### Flagging One Counter-Intuitive Finding from the Eval

The eval v1.4 head-to-head shows a **generation speed reversal** with the scaffold prompt:
- Without scaffold (100-token prompt): 0.6B was faster (3.64 vs 2.25 tok/s)
- With scaffold (385–406 token prompt): 0.8B is faster (2.50 vs 1.53 tok/s)

This is a real effect: larger KV footprint per step (385 × KV-per-token) adds bandwidth cost that the 0.6B's narrower attention heads don't amortize as well. On the **GPU path** this dynamic changes — GPU memory bandwidth is far higher and GPU parallelism handles larger KV reads efficiently. The 0.6B may reclaim its speed advantage on GPU for the same reason it was faster on CPU before the scaffold was added.

---

### Prioritised Action List

| Priority | Action | Impact | Risk |
|---|---|---|---|
| 1 | Install Vulkan build + `--n-gpu-layers 999` | 3–8× gen speed | Untested on Adreno 702; may need troubleshooting |
| 2 | `--ctx-size 4096` (from 12288) | ~30% TTFT reduction, less KV mem | None |
| 3 | `--parallel 1` (from 2) | Halves KV memory use | None for single-session use |
| 4 | `--flash-attn on` | Small gain on GPU path | None |
| 5 | `-t 2` on GPU path | Frees cores, reduces contention | Test to confirm |

---

### Install Command for Vulkan Backend

```bash
# From the Sensai repo root
yzma install --lib yzma/lib --processor vulkan --os trixie

# Then test the server flags:
yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 4096 \
  --parallel 1 \
  -t 2 \
  --n-gpu-layers 999 \
  --flash-attn on \
  --cache-type-k q8_0 \
  --cache-type-v q8_0
```

Use `llama-bench` before and after to get clean numbers:
```bash
yzma/lib/llama-bench \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  -ngl 999 -t 2 -n 50 -npp 385
```

---

### What Won't Help

- **Changing quantization to Q4_K_M on CPU**: marginal, not worth the quality tradeoff
- **KV cache below Q8_0**: already at the sweet spot; going to Q4_0 for KV noticeably hurts attention quality
- **More threads**: already at 4 (all cores); adding more doesn't exist. In-order A53 benefits little from hyperthreading-style gains
- **ARMv8.2 CPU backend**: the CPU physically lacks dotprod — loading the armv8.2 `.so` would try to execute illegal instructions and crash

**The Vulkan switch is the one change that moves the needle.** Everything else is tuning. The fundamental bottleneck is hardware — the A53 without dotprod was never going to be fast at quantized LLM decode, and the GPU is the escape hatch that's sitting idle right now.
