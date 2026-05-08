# Vulkan Lite Implementation Plan
## Sensai on Adreno 702 — hybridgroup/llama-cpp-builder Path

**Date:** 2026-05-07
**Branch:** `sensai-vulkan`
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702 @ 845 MHz)
**Binary:** `llama-b9049-bin-ubuntu-trixie-vulkan-arm64` (hybridgroup/llama-cpp-builder)
**Driver:** Mesa Turnip (`freedreno_icd.json`), Vulkan 1.3

---

## 1. Approach: Pre-built Vulkan Binary via yzma

The previous approach built llama.cpp from Wang's `opencl/nvidia` fork using cmake. This plan
replaces that with the **hybridgroup/llama-cpp-builder** pre-built Vulkan binary, managed by yzma's
existing download infrastructure.

**Why this is better:**

| Old (cmake approach) | New (hybridgroup binary) |
|---|---|
| Requires cmake, glslc, libvulkan-dev | `make sensai-vulkan-download` only |
| 20–40 min build on Cortex-A53 | ~3 min download |
| Out-of-tree Wang fork (stale) | Tracked hybridgroup release (b9049) |
| Patch applied to C++ source | Patch applied once; re-download on update |
| Lives in `~/ArduinoApps/llama-opencl/` | Lives in `yzma/lib-vulkan/` (in-repo) |

**Binary location after download:** `yzma/lib-vulkan/llama-server`

---

## 2. Quick Start

```bash
# 1. Download the Vulkan binary into yzma/lib-vulkan/ (one-time, ~200 MB)
make sensai-vulkan-download

# 2. Ensure Mesa Turnip Vulkan driver is installed
sudo apt install mesa-vulkan-drivers

# 3. Download Q4_0 model if not already present
mkdir -p ~/models
wget -O ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf'

# 4. Launch
make sensai-vulkan
```

---

## 3. Download Mechanism

`make sensai-vulkan-download` fetches directly from hybridgroup/llama-cpp-builder:

```bash
URL=https://github.com/hybridgroup/llama-cpp-builder/releases/download/b9049/
  llama-b9049-bin-ubuntu-trixie-vulkan-arm64.tar.gz
wget -q --show-progress -O yzma/lib-vulkan/<tarball> "$URL"
tar -xzf <tarball> -C yzma/lib-vulkan/ --strip-components=1
```

> **Note:** The `yzma install --os trixie` flag requires yzma v1.11+ (Go 1.25). The board runs
> Go 1.24, so the direct wget path is used. The URL follows the same convention that yzma uses
> internally (`hybridgroup/llama-cpp-builder/releases/download/<version>/llama-<version>-bin-ubuntu-trixie-vulkan-arm64.tar.gz`).

Downloads → extracts into `yzma/lib-vulkan/`:
- `llama-server` — the primary Sensai binary
- `llama-bench` — for benchmarking
- `llama-cli` — for interactive testing
- `libggml-vulkan.so`, `libggml.so`, `libllama.so` — runtime shared libraries

The `VULKAN_LLAMA_SERVER` and `VULKAN_LIB_DIR` Makefile variables both resolve to this directory.

---

## 4. The 16 KB Shared Memory Constraint

The Adreno 702 (FD702) has `maxComputeSharedMemorySize = 16384` bytes. The llama.cpp Vulkan
backend defines three tiling profiles via Specialization Constants:

| Profile | Shared mem usage | Status on FD702 |
|---|---|---|
| `l_warptile` (large, 64×64) | 16.9 KB | Auto-rejected by shmem check |
| `m_warptile` (medium, 32×32) | 8.4 KB | **Works** — optimal for prefill |
| `s_warptile` (small, 16×16) | 4.2 KB | **Works** — fallback for all types |

The mainline llama.cpp Vulkan backend (b9049) already contains a shared memory check at pipeline
creation time. When a pipeline exceeds `maxComputeSharedMemorySize`, it falls back to a smaller
tile automatically. This means `l_warptile` (16.9 KB > 16 KB) is already rejected without any
patch; `m_warptile` and `s_warptile` operate within limits for Q4_0 and Q6_K.

### 4.1 IQ1 LUT Issue

IQ1_S and IQ1_M quantization types use 12 KB lookup tables (LUTs) that push total shared memory
to ~16.5 KB, exceeding the FD702 limit. The Vulkan Lite patch described in
[vulkan-lite-feasibility-study.md](vulkan-lite-feasibility-study.md) addresses this with two
fixes to `ggml-vulkan.cpp`:

1. **IQ1 graceful disable** (~line 3428): Changed `throw` to per-type `mul_mat_* = false; continue`
   so IQ1 tensors fall back to CPU instead of crashing.
2. **`supports_op` fallback** (~line 15570): Added `!mul_mat_s && !mul_mat_m && !mul_mat_l → return false`
   so IQ1 `GGML_OP_MUL_MAT` ops return false and dispatch to CPU.

**Action:** Test whether the b9049 pre-built binary handles IQ1 gracefully. If it crashes on
IQ1 models, apply the patch and build from source; see §6.

**Sensai production model** (`Qwen3.5-0.8B-Q4_0`, `Qwen3.5-0.8B-Q6_K`) does not use IQ1 —
these quantization types are only present in heavily quantized models below Q2. The IQ1 issue
is not expected to affect normal Sensai operation.

---

## 5. Environment and Launch Flags

`make sensai-vulkan` / `scripts/sensai-vulkan-launch.sh` sets:

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json   # Force Mesa Turnip, skip llvmpipe
LD_LIBRARY_PATH=yzma/lib-vulkan:$LD_LIBRARY_PATH               # Runtime libs from yzma download
```

llama-server flags:

| Flag | Value | Reason |
|---|---|---|
| `-ngl 999` | offload all layers | Q4_0 s/m_warptile within 16 KB; GPU does matmul |
| `--no-flash-attn` | disable FA | Flash Attention kernel exceeds 16 KB on FD702 |
| `--ctx-size 512` | 512 tokens | Stay within single-CU GPU TDR budget (~5 s) |
| `-t 2` | 2 CPU threads | Minimal CPU use; GPU handles inference |
| `--parallel 1` | 1 slot | Avoid context fragmentation on 4 GB LPDDR4X |
| `--host 127.0.0.1` | loopback | Local-only; gateway handles external connections |
| `--port 8080` | default port | OpenAI-compat endpoint for picoclaw gateway |

---

## 6. Version Pinning and Updates

The Makefile variable `VULKAN_VERSION?=b9049` pins the binary version. To update:

```bash
# Edit Makefile: VULKAN_VERSION?=b<new>
make sensai-vulkan-download   # re-downloads with -u (upgrade flag)
```

To check what version is currently installed:

```bash
yzma/lib-vulkan/llama-server --version 2>/dev/null | head -1
```

---

## 7. Vulkan Lite Source Patch (If Needed)

If the pre-built binary exhibits IQ1 crashes or the 16 KB rejection is not handled gracefully,
apply the Vulkan Lite patch to a source build:

```bash
# Clone a clean llama.cpp at the b9049 tag
git clone https://github.com/ggml-org/llama.cpp ~/ArduinoApps/llama-cpp-vulkan
cd ~/ArduinoApps/llama-cpp-vulkan
git checkout b9049

# Apply IQ1 graceful disable (ggml-vulkan.cpp ~line 3428)
# Change: throw std::runtime_error(...)
# To:     mul_mat_s[i] = false; mul_mat_m[i] = false; mul_mat_l[i] = false; continue;

# Apply supports_op fallback (ggml-vulkan.cpp ~line 15570)
# Add: if (!mul_mat_s && !mul_mat_m && !mul_mat_l) return false;

# Build static (avoids SPIR-V symbol linking issue with shared libs)
cmake -S . -B build-vulkan \
    -DGGML_VULKAN=ON \
    -DGGML_OPENCL=OFF \
    -DCMAKE_BUILD_TYPE=Release \
    -DGGML_NATIVE=OFF \
    -DLLAMA_BUILD_SERVER=ON \
    -DBUILD_SHARED_LIBS=OFF
cmake --build build-vulkan --target llama-server llama-bench -j4

# Override the Makefile variable to use the patched binary
make sensai-vulkan VULKAN_LLAMA_SERVER=~/ArduinoApps/llama-cpp-vulkan/build-vulkan/bin/llama-server
```

---

## 8. Benchmark Plan (Vulkan Eval v1)

Once `make sensai-vulkan-download` completes, run the following benchmark sequence:

### 8.1 Verify Vulkan device

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
    yzma/lib-vulkan/llama-server --list-devices 2>&1 | head -20
```

Expected: `Turnip Adreno (TM) 702` with `maxComputeSharedMemorySize = 16384`.

### 8.2 CPU baseline (reference)

```bash
yzma/lib/llama-bench \
    -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
    -ngl 0 -t 4 \
    -p 32,128,512 -n 64 -r 3
```

### 8.3 Vulkan GPU

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
LD_LIBRARY_PATH=yzma/lib-vulkan \
    yzma/lib-vulkan/llama-bench \
        -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
        -ngl 999 -t 2 \
        --no-flash-attn \
        -p 32,128,512 -n 64 -r 3
```

### 8.4 Vulkan GPU — smaller model

```bash
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
LD_LIBRARY_PATH=yzma/lib-vulkan \
    yzma/lib-vulkan/llama-bench \
        -m ~/models/Qwen_Qwen3-0.6B-Q4_0.gguf \
        -ngl 999 -t 2 \
        --no-flash-attn \
        -p 32,128,512 -n 64 -r 3
```

Results should be written to `docs/Sensai/Vulkan/vulkan-eval-v1-results.md` following the same
format as `docs/Sensai/eval/`.

---

## 9. File Inventory

| File | Role |
|---|---|
| `yzma/lib-vulkan/llama-server` | Primary Vulkan inference binary (downloaded by yzma) |
| `yzma/lib-vulkan/llama-bench` | Benchmark binary for eval runs |
| `yzma/lib-vulkan/libggml-vulkan.so` | Vulkan GGML backend shared library |
| `scripts/sensai-vulkan-launch.sh` | Launch script: sets VK_ICD_FILENAMES, LD_LIBRARY_PATH |
| `docs/Sensai/Vulkan/vulkan-lite-feasibility-study.md` | Design rationale: tiling, 16 KB analysis |
| `docs/Sensai/Vulkan/vulkan-implementation-plan.md` | This document |
| `docs/Sensai/Vulkan/vulkan-eval-v1-results.md` | Benchmark results (to be written after eval) |

---

## 10. References

| Source | URL |
|---|---|
| hybridgroup/llama-cpp-builder | https://github.com/hybridgroup/llama-cpp-builder |
| hybridgroup/yzma | https://github.com/hybridgroup/yzma |
| Mesa Turnip Vulkan driver | https://docs.mesa3d.org/drivers/freedreno.html |
| llama.cpp Vulkan backend | https://github.com/ggml-org/llama.cpp/blob/master/docs/vulkan.md |
| Vulkan Lite feasibility study | `docs/Sensai/Vulkan/vulkan-lite-feasibility-study.md` |
