# OpenCL GPU Improvement Roadmap
## Adreno 702 / FD702 — Gap Analysis, Path Forward, and yzma Integration

**Date:** 2026-05-06
**Branch:** `sensai-gpu`
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702 @ 845 MHz)
**Reference:** `docs/Sensai/Adreno_702_OpenCL_Prefill_Acceleration_Whitepaper.md` (March 2026)

---

## 1. Foundation: The Two Llama-Server Worlds

Before diving into the gap analysis, it is essential to understand the architectural split between the two llama.cpp builds in use. They are not interchangeable — they represent fundamentally different software stacks.

### 1.1 yzma `lib/llama-server` — The Production Binary

```
Source:    hybridgroup/llama-cpp-builder  (pre-compiled)
Build:     llama-b9014-bin-ubuntu-trixie-cpu-arm64
Backend:   CPU only (armv8.0 NEON, no OpenCL)
Path:      yzma/lib/llama-server
Used by:   make sensai → scripts/sensai-launch.sh
Speed:     pp=9.30 t/s  |  tg=4.15 t/s  (4-thread, Q4_0, 0.8B)
Status:    PRODUCTION — stable, validated, recommended default
```

This binary has no OpenCL backend compiled in. It is the fastest CPU path available for the A53
and is used by the normal `make sensai` flow. It loads via yzma's purego/FFI path when using the
Go application directly (`picoclaw gateway`), but for the Sensai chat use case, the binary itself
runs the server — yzma's Go FFI bindings are not involved in normal operation.

#### Why yzma's Go FFI Is Not Used in the Sensai Chat Path

The picoclaw gateway is **provider-agnostic** — it speaks OpenAI-compatible HTTP to whatever
backend is configured. Using `llama-server` as a separate process means the same `openai_compat`
provider code works identically whether inference is local or cloud, with zero special-casing.
The gateway has no inference logic at all.

The secondary reason is **lifecycle independence**: the model load on the Uno Q is expensive
(~30s cold start). Running `llama-server` as a separate process means the gateway can restart,
crash, or be reconfigured without re-loading the model. The two processes are independently
managed via PID files.

Yzma's Go FFI (`purego`/`jupiterrider/ffi` → `libllama.so`) exists for use cases where you want
*in-process* inference from Go — embedding the LLM directly in a Go binary. That is a different
application shape than the gateway-over-HTTP model Sensai uses. To adopt the FFI path in Sensai,
you would need to pull all of the context management, streaming, parallel slots, and OpenCL
dispatch (currently handled by `llama-server`) into the gateway itself — a significant rewrite
with no practical benefit on a single-user embedded board.

#### Yzma's Two Roles: Binary Distributor vs. Go FFI Layer

In Sensai today, **yzma is used only as a binary distribution mechanism**. The submodule at
`yzma/lib/llama-server` is a convenient, version-pinned pre-compiled llama.cpp server for the
target platform. You could replace it with any llama.cpp build — which is exactly what
`make sensai-gpu` does, swapping in Wang's binary instead. Yzma's actual Go FFI code is unused
by the gateway.

**Yzma's real value** is its CGo-free Go binding layer. The reason this matters for edge/Arduino
targets is not model-level optimization — it is **cross-compilation**. CGo breaks standard Go
cross-compilation (`GOARCH=arm64 go build` fails when C libraries are involved). Yzma's pure-Go
FFI approach lets you build the entire agent binary on an x86 dev machine and drop the ARM64
binary onto the board, with the llama.cpp shared library shipped separately.

| Role | What it provides |
|---|---|
| **yzma (lib binaries)** | A pre-built `llama-server` to run as an HTTP process — replaceable |
| **yzma (Go FFI)** | CGo-free in-process inference for Go — essential if you want to eliminate the HTTP boundary entirely |

If you wanted a truly unified single-binary Sensai (gateway + inference in one process, no HTTP
overhead), yzma's FFI bindings are exactly the right tool. On a constrained 4 GB board, that
architecture is worth considering — but it would require integrating `yzma/pkg/llama` directly
into the agent loop rather than delegating to an HTTP server.

### 1.2 Wang-branch `llama-wang/build/bin/llama-server` — The GPU Research Binary

```
Source:    wanghqc/llama.cpp  branch opencl/nvidia
Backend:   OpenCL (Mesa rusticl / FD702) with 5 FD702-specific patches
Path:      /home/arduino/ArduinoApps/llama-wang/build/bin/llama-server
Env:       RUSTICL_ENABLE=freedreno  LD_LIBRARY_PATH=.../llama-wang/build/bin
Used by:   make sensai-gpu → scripts/sensai-gpu-launch.sh
Speed:     pp~4 t/s (small batch)  |  tg~0.22 t/s  (GPU, constrained by TDR)
Status:    EXPERIMENTAL — stable at p≤32; TDR at p=385 with ngl=999
```

This is a full from-source build with the OpenCL backend enabled and Wang's `use_no_subgroups_compat`
preamble active. It is not part of the yzma submodule — it lives separately in `llama-wang/`.

### 1.3 How They Relate to yzma's Go FFI Path

The yzma Go library (`yzma/pkg/llama`) loads llama.cpp via `purego` FFI — it calls
`llama.Load(libPath)` which opens `libllama.so` dynamically. The **server binary** and the **Go FFI
path** are separate entry points to the same C API, but only the Go path requires a shared library
build (`BUILD_SHARED_LIBS=ON`). The server binary links statically.

To bring the Wang-branch GPU backend into the yzma Go path (picoclaw gateway calling the model
directly instead of via an HTTP server), the Wang branch must be rebuilt as shared libraries
and hot-swapped into `yzma/lib/`. This is covered in Section 5.

---

## 2. Gap Analysis: Whitepaper Plan vs. Actual Implementation

The March 2026 whitepaper was written assuming the **Qualcomm proprietary OpenCL ICD** — the
`libOpenCL_adreno.so` stack accessed via `/dev/kgsl-3d0`. Our May 2026 work was forced onto
**Mesa rusticl** because the KGSL node is absent from the current Debian BSP. This single
difference cascades into almost every technical gap below.

### 2.1 OpenCL Driver Stack

| Whitepaper Assumption | Actual (May 2026) | Gap |
|---|---|---|
| `QUALCOMM Snapdragon(TM)` platform | `rusticl` platform | **Different ICD entirely** |
| `QUALCOMM Adreno(TM) 702` device | `FD702` device | Mesa naming convention |
| OpenCL 2.0 proprietary | OpenCL 3.0 Mesa | Newer spec, fewer extensions |
| `/dev/kgsl-3d0` present | Absent | KGSL kernel module not loaded |

**Status: UNRESOLVED.** The proprietary ICD is the highest-priority missing piece. Without it,
every Qualcomm-specific extension is unavailable. See Section 3.1 for the unlock path.

### 2.2 SVM Zero-Copy (Unified Memory)

| Whitepaper | Actual | Impact |
|---|---|---|
| SVM coarse-grain buffer expected | All SVM variants: `false` | Model duplicated in RAM |
| Zero-copy UMA advantage | Full copy on buffer creation | +340 MB extra RAM usage |
| Single ~340 MB allocation | ~680 MB total (model+copy) | Memory pressure |

The whitepaper's Section 6.1 identified SVM as the key UMA optimization: without it, `clCreateBuffer`
copies the model weights into a separate GPU-accessible allocation, consuming double the memory.
On our 4 GB board this is feasible (~2 GB headroom) but leaves less margin.

rusticl does not expose `CL_DEVICE_SVM_CAPABILITIES` for FD702. This is a Mesa driver gap, not a
hardware limitation — the Adreno 702 shares DRAM with the CPU and physically supports zero-copy.
When Mesa adds SVM support for Freedreno (tracked alongside `cl_khr_subgroups`), this will be free.

**Status: BLOCKED on Mesa.** No workaround available without the proprietary ICD.

### 2.3 Subgroup Support

| Whitepaper | Actual | Resolution |
|---|---|---|
| Native `cl_khr_subgroups` assumed | Max sub-groups = 0 | Wang compat preamble |
| `sub_group_reduce_add` native | `__local` tree-reduction | 3-5× slower per op |
| `cl_qcom_reqd_sub_group_size` | Not available in rusticl | Preamble maps to lws |
| Subgroup ballot/shuffle | Not available | Stubbed as identity |

Wang's `use_no_subgroups_compat` preamble handles this correctly — hot kernels (Q4_K GEMV,
Q6_K GEMV) use `#ifdef NVIDIA_GPU` blocks with explicit `__local float4 lm[N]` tree-reduction.
The overhead is real: each reduction now requires a barrier + sequential partial sums instead of
a single hardware warp-reduce instruction. This is the primary reason GPU decode (tg) is slower
than the CPU baseline.

**Status: PARTIALLY RESOLVED.** Functional but slower than native subgroups. Will improve
automatically when Mesa adds `cl_khr_subgroups` for FD702.

### 2.4 Model Quantization Format

| Whitepaper | Actual | Impact |
|---|---|---|
| `--pure Q4_0` recommended (Qwen3-0.6B) | Qwen3.5-0.8B-Q4_0 (mixed) | Q6_K lm_head |
| Single kernel dispatch path | Q6_K CPU fallback required | Adds CPU round-trip |
| All tensors on GPU | lm_head on CPU | ~188 MB tensor CPU-bound |
| Qwen3-0.6B (~340 MB) | Qwen3.5-0.8B Q4_0 (~470 MB) | Larger model |

The whitepaper explicitly recommends `--pure Q4_0` to ensure a single kernel path. The
Qwen3.5-0.8B-Q4_0.gguf we use has its lm_head/token-embedding weight at Q6_K (248320 × 1024),
which our Patch 6 (`ggml_opencl_supports_op` exclusion) routes to CPU. This works, but adds
a synchronous CPU round-trip on every token's lm_head projection.

**Immediate fix available:** Download Qwen3-0.6B-Q4_0.gguf — a smaller model where the lm_head
is Q4_0 throughout. This also reduces total model size from ~470 MB to ~340 MB, saving ~130 MB RAM
and reducing KV cache computation by 25%.

### 2.5 Flash Attention

| Whitepaper | Actual | Issue |
|---|---|---|
| `--no-flash-attn` or cautious | `--flash-attn on` in sensai-launch.sh | May cause regressions |
| Disable unless validated | Enabled by default in GPU path | Untested on FD702 |

The whitepaper explicitly flags: _"Flash attention does not always improve perf; disable with
`--no-flash-attn` if regressions observed."_ Our GPU launch script should disable it explicitly.

### 2.6 Context Size and Batch Limits

| Whitepaper | Actual | Gap |
|---|---|---|
| 512–1024 ctx recommended | 12288 ctx in production | 24× too large |
| Short ctx saves GPU memory | Long ctx = large KV alloc | Memory + TDR pressure |
| Max practical: 2048–4096 | Production: 12288 | Exceeds guidance |

The 12288 context window on the GPU path is the likely driver of TDR timeouts at p=385. Each
attention step over 12288 positions is a massive kernel dispatch. The whitepaper recommends 512–1024
for interactive use. The GPU launch script (`make sensai-gpu`) uses 512.

### 2.7 GMEM On-Chip Cache

| Whitepaper | Actual | Status |
|---|---|---|
| 128–256 KB GMEM available | Not accessible via rusticl | Blocked on proprietary ICD |
| Vendor extension `CL_LARGE_BUFFER_QCOM` | Partially present (0x41A6 in code) | Falls back to DRAM |

Wang's branch has a `CL_LARGE_BUFFER_QCOM` path at line 6766 in ggml-opencl.cpp, but this
Qualcomm extension only works with the proprietary ICD. rusticl ignores it and allocates from DRAM.

### 2.8 Integer Dot-Product Extension

| Whitepaper | Actual | Status |
|---|---|---|
| `cl_qcom_dot_product_8bit_integer` | Not in rusticl | Blocked |
| Hardware INT8 IDOT accelerator | Not exposed | CPU fallback |

The A702 has hardware INT8 dot-product units used by Qualcomm's proprietary kernels. This is the
source of the whitepaper's "5–13× prefill speedup" projection. Mesa rusticl uses LLVM to compile
generic IR — it can emit NEON SDOT instructions but not Adreno-specific IDOT via the CL extension.

---

## 3. Improvement Roadmap

Improvements are ordered by expected impact and implementation effort.

### 3.1 Priority 1 — Pure Q4_0 Model (Immediate, Free)

**What:** Switch from `Qwen3.5-0.8B-Q4_0.gguf` (mixed Q4_0/Q6_K) to `Qwen3-0.6B-Q4_0.gguf`
(true pure Q4_0).

**Why:** Eliminates the Q6_K lm_head CPU round-trip on every decode step. The 0.6B model's lm_head
weight uses Q4_0 throughout — no CPU fallback needed. Also smaller (340 MB vs 470 MB).

**How:**
```bash
mkdir -p ~/models
wget -O ~/models/Qwen3-0.6B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/qwen3-0.6b-q4_0.gguf'
```

Then launch with `SENSAI_MODEL=~/models/Qwen3-0.6B-Q4_0.gguf make sensai-gpu`.

**Expected gain:** Removes CPU synchronization on every token's projection step. Decode throughput
on GPU should improve from ~0.22 t/s to the GPU's actual matmul ceiling.

### 3.2 Priority 2 — Disable Flash Attention (Immediate)

**What:** Add `--no-flash-attn` to the GPU launch flags.

**Why:** Flash attention is a memory-access optimization for long contexts. On FD702 with rusticl,
its kernels are unvalidated and may conflict with the no-subgroups compat preamble. The whitepaper
recommends disabling it until validated.

**Status:** Already disabled in `scripts/sensai-gpu-launch.sh` (shipped with this commit).

### 3.3 Priority 3 — Reduce Context Window (Immediate)

**What:** Use `--ctx-size 512` for the GPU path instead of the production 12288.

**Why:** At 12288 tokens, each attention kernel dispatches over 12288 positions — a massive GPU
command buffer that triggers the TDR watchdog. At 512 tokens, the same kernel is 24× smaller,
well within the ~5-second TDR window even at batch size 385.

**Expected gain:** Should eliminate TDR-related crashes at p=385. The trade-off is shorter context
window for classroom use, but 512 tokens handles the SOUL.md system prompt (250 tokens) + student
question (100 tokens) + response (100 tokens) with margin.

**Status:** Set to 512 in `scripts/sensai-gpu-launch.sh`.

### 3.4 Priority 4 — Partial Layer Offload (Short-term)

**What:** Try `-ngl 14` (half the 28 layers) instead of `-ngl 999`.

**Why:** Full offload puts 100% of GPU work on the single-CU Adreno 702. Partial offload splits
work between CPU and GPU, potentially avoiding TDR while still accelerating the most compute-heavy
early layers.

**How to test:**
```bash
# Test half-offload stability
RUSTICL_ENABLE=freedreno LD_LIBRARY_PATH=.../llama-wang/build/bin \
.../llama-bench -m ~/models/Qwen3-0.6B-Q4_0.gguf -ngl 14 -t 4 -p 385 -n 50 -r 3
```

**Expected behaviour:** CPU handles layers 15–28 (including lm_head). GPU handles layers 1–14.
Lower GPU load should prevent TDR. Trade-off: CPU becomes the bottleneck for 50% of ops.

### 3.5 Priority 5 — KV Cache Quantization (Short-term)

**What:** Switch KV cache from Q8_0 to Q4_0.

**Why:** Each KV cache entry at Q8_0 costs 56 KB per token for 0.8B (8 KV heads × 128 head_dim ×
2 bytes × 2 tensors). At 512 context, this is ~28 MB. Halving to Q4_0 saves 14 MB and reduces
the GPU memory bus pressure during attention operations.

**How:**
```bash
--cache-type-k q4_0 --cache-type-v q4_0
```

**Status:** In `scripts/sensai-gpu-launch.sh`.

### 3.6 Priority 6 — Wang-branch Preamble Optimization (Medium-term)

**What:** Tune the `use_no_subgroups_compat` preamble for A702's specific constraints.

**Current preamble cost:** Every subgroup reduction becomes a full-WG barrier + tree-reduction.
For a WG of 32 threads doing Q4_K GEMV, this means 5 barrier rounds (log2(32)) per dot-product.
On the A702's single CU, barriers stall the entire compute pipeline.

**Optimization directions:**
1. Reduce default `nth0` from 32 to 16 for GEMV kernels — halves barrier depth (log2(16)=4)
2. Use `mem_fence(CLK_LOCAL_MEM_FENCE)` instead of full `barrier()` where writes/reads don't cross
3. Unroll the tree-reduction loop (fixed depth = 5 iterations for nth=32)

**Expected gain:** 20–40% reduction in GEMV kernel latency by reducing barrier stall cycles.

### 3.7 Priority 7 — Proprietary OpenCL ICD (Long-term, Highest Impact)

**What:** Get `/dev/kgsl-3d0` loaded and use `libOpenCL_adreno.so` instead of rusticl.

**Why:** This is the path the whitepaper was actually designed for. With the proprietary ICD:
- SVM zero-copy eliminates the ~340 MB model duplication
- Native subgroups eliminate the `__local` tree-reduction overhead
- `cl_qcom_dot_product_8bit_integer` enables hardware INT8 acceleration
- GMEM on-chip cache reduces attention memory traffic
- True prefill speedup: 5–13× (vs ~1× we have now on tg)

**How to unlock:**
```bash
# Check if kgsl module exists but isn't loaded
find / -name "kgsl.ko" 2>/dev/null
modprobe kgsl 2>/dev/null && echo "loaded"

# Check vendor partition for OpenCL ICD
ls /vendor/lib64/libOpenCL* 2>/dev/null
```

Contact Arduino/Qualcomm for a BSP update that includes the KGSL kernel module. The QRB2210
ships with proprietary OpenCL on Android-based images — the Debian BSP is missing it.

**Alternative:** Build a custom kernel with `CONFIG_DRM_MSM_GPU_SCHEDULER` and the KGSL out-of-tree
module from the Qualcomm Linux kernel tree.

---

## 4. Expected Performance After Improvements

### 4.1 Mesa rusticl path (achievable now with Priorities 1–5)

| Configuration | pp t/s | tg t/s | Stable at |
|---|---|---|---|
| Current (ngl=999, 0.8B, ctx=12288) | ~4 (p≤32) | ~0.22 | p≤32 |
| + Pure Q4_0 0.6B model | ~5 (p≤32) | ~0.4 (est) | p≤32 |
| + ctx=512 | ~4 | ~0.4 | **p≤385** (TDR resolved) |
| + ngl=14 (partial) | ~2 hybrid | ~2 hybrid | p≤385 |

The key insight: GPU tg will **not** beat CPU tg on rusticl/FD702 without the proprietary ICD.
The A53 CPU at 4.15 tg tok/s outperforms the emulated-subgroup GPU path. The GPU path's value
on rusticl is research, not production.

### 4.2 Proprietary ICD path (if KGSL becomes available)

| Metric | CPU baseline | Projected GPU (prop. ICD) |
|---|---|---|
| pp tok/s (256-tok prompt) | 9.30 | 80–200 |
| tg tok/s | 4.15 | 8–12 (unchanged — BW bound) |
| TTFT (256-tok) | ~28s | **2–4s** |

These are the numbers the whitepaper targeted and remain achievable with the proprietary stack.

---

## 5. Bridging Wang-branch GPU Back to the yzma Go Path

The yzma Go application (`picoclaw gateway`) currently calls llama.cpp via HTTP through
`llama-server`. For direct in-process FFI (eliminating the HTTP round-trip), yzma loads
`libllama.so` via `purego`. The Wang-branch GPU backend can be made available to this path.

### 5.1 Why This Matters

The HTTP server approach (`make sensai-gpu` → `sensai-gpu-launch.sh` → wang llama-server)
adds ~1–5 ms per request for HTTP serialization + JSON parsing. For classroom-scale use this
is irrelevant. But for tight Go integration (custom tool calls, streaming callbacks, direct
context management), having the GPU backend in-process via FFI is cleaner.

### 5.2 Build Wang-branch as Shared Libraries

The current Wang build produces static executables. To get shared libraries for FFI:

```bash
cd /home/arduino/ArduinoApps/llama-wang
cmake -B build-shared \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DGGML_OPENCL=ON \
  -DGGML_OPENCL_EMBED_KERNELS=ON \
  -DGGML_OPENCL_USE_ADRENO_KERNELS=ON \
  -DOpenCL_INCLUDE_DIR=/home/arduino/ArduinoApps/opencl-headers \
  -DOpenCL_LIBRARY=/usr/lib/aarch64-linux-gnu/libOpenCL.so.1 \
  -DCMAKE_C_FLAGS='-O3' \
  -DCMAKE_CXX_FLAGS='-O3'

make -C build-shared llama ggml ggml-opencl -j2
```

This produces:
- `build-shared/bin/libllama.so`
- `build-shared/bin/libggml.so`
- `build-shared/bin/libggml-opencl.so`
- `build-shared/bin/libggml-base.so`

### 5.3 Hot-Swap into yzma/lib

```bash
# Backup CPU build
cp yzma/lib/llama-server yzma/lib/llama-server.cpu-backup

# Install GPU shared libraries
cp /home/arduino/ArduinoApps/llama-wang/build-shared/bin/lib*.so* yzma/lib/

# Verify
ls -la yzma/lib/libllama.so
ldd yzma/lib/libllama.so | grep -i opencl
# Should show: libOpenCL.so.1 => /usr/lib/.../libOpenCL.so.1
```

### 5.4 Go Code Changes for GPU Offload

In `yzma/pkg/llama` (or wherever the Go FFI caller configures model params), set GPU layers:

```go
// pkg/llama/model.go (or equivalent)
mparams := llama.ModelDefaultParams()
mparams.NGPULayers = 99   // All layers to GPU
// mparams.NGPULayers = 14 // Partial offload if TDR occurs

model, err := llama.ModelLoadFromFile(modelPath, mparams)
```

No changes to picoclaw's gateway or agent loop are needed — yzma's FFI interface is opaque to
the caller. The OpenCL backend initializes automatically when `NGPULayers > 0` and an OpenCL
device is present.

### 5.5 Environment for GPU FFI Path

When running picoclaw with the GPU-enabled libllama.so, the environment must expose rusticl:

```bash
export RUSTICL_ENABLE=freedreno
export LD_LIBRARY_PATH=/home/arduino/ArduinoApps/Sensai/yzma/lib:$LD_LIBRARY_PATH
./build/picoclaw gateway
```

Or via the Makefile (see Section 6):

```bash
make sensai-gpu-gateway   # Starts picoclaw gateway with GPU libs (future target)
```

### 5.6 Recommendation: HTTP Server vs. Direct FFI

For Sensai's current use case (classroom terminal chat), the HTTP server approach is simpler and
equally fast. The `make sensai-gpu` target (below) uses the Wang-branch llama-server binary
directly. Direct FFI hot-swap adds complexity without meaningful user-facing benefit until the
proprietary ICD is available (at which point 5–13× prefill speedup makes the GPU genuinely faster
than CPU, and the direct FFI path would reduce latency by ~5ms per request).

**Recommendation:** Use `make sensai-gpu` (HTTP server path) for now. Revisit direct FFI when
KGSL becomes available.

---

## 6. GPU Path Quick-Start Summary

```bash
# Build the Wang-branch GPU server (one-time, ~5 minutes)
cd /home/arduino/ArduinoApps/llama-wang
make -C build llama-bench llama-server -j2

# Download the pure Q4_0 0.6B model (recommended)
wget -O ~/models/Qwen3-0.6B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/qwen3-0.6b-q4_0.gguf'

# Start Sensai with GPU acceleration
cd /home/arduino/ArduinoApps/Sensai
make sensai-gpu

# Stop when done
make sensai-gpu-stop
```

**When to use GPU vs CPU:**

| Scenario | Recommendation |
|---|---|
| Production classroom use | `make sensai` (CPU, 4.15 tg t/s, stable) |
| Long prompts / prefill research | `make sensai-gpu` (GPU, prefill may be faster at p≤32) |
| Proprietary ICD available | GPU path becomes dominant for all scenarios |
