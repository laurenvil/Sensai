# Sensai Evaluation — v5: Tier 3 Hexagon NPU Analysis

**Date:** 2026-05-05
**Branch:** `sensai-NPU`
**Hardware:** Arduino Uno Q (QRB2210) / Arduino Ventuno Q (QRB5165N, Q2 2026)
**Objective:** Feasibility analysis of QNN backend (`ggml-qnn`) as the Tier 3 acceleration path.

---

## 1. Executive Summary

The Tier 3 "Hexagon NPU" path is **bifurcated by hardware generation**. The QRB2210 on the Uno Q
does not have a Neural Processing Unit in the modern sense. It has a Hexagon V73 DSP with HVX
vector extensions — a general-purpose signal processor that can be coerced into matrix math but
requires a brittle kernel-driver chain that is missing from the current BSP. The QNN SDK is
officially Android-only; there is no documented runtime for Debian aarch64.

The QRB5165N on the forthcoming Ventuno Q is a fundamentally different situation. Its Hexagon 780
HTP (Hexagon Tensor Processor) is a purpose-built AI accelerator rated at 40 TOPS, QNN is its
native execution environment, and llama.cpp's `ggml-qnn` backend is the correct integration point.

**Conclusion:** There is no viable Tier 3 path on the Uno Q within this project's timeline.
Tier 3 work should be treated as a Ventuno Q preparation task, starting now so it is ready when
hardware ships.

---

## 2. Hardware Reality Check: QRB2210 vs QRB5165N

The term "Hexagon NPU" requires disambiguation across these two chips.

### 2.1 QRB2210 (Arduino Uno Q) — Hexagon V73 DSP + HVX

| Feature | Detail |
| :--- | :--- |
| Hexagon core | V73 (6th generation DSP) |
| AI accelerator | **None** — no HTP, no dedicated tensor engine |
| Vector unit | HVX at 1024-bit width |
| Theoretical peak | ~32 fp32 MACs/cycle → modest at DSP clock speeds |
| Access mechanism | FastRPC (Qualcomm RPC to the DSP subsystem) |
| BSP status | `/dev/fastrpc-*` nodes **absent** in current Debian BSP |
| QNN SDK support | Android only; embedded Linux requires cross-compile + BSP integration |

The Adreno 702 evaluation (Evals v3 and v4) hit the same BSP gap: proprietary Qualcomm kernel
nodes were missing (`/dev/kgsl-3d0` for OpenCL, now `/dev/fastrpc-*` for DSP). These are not
missing-feature gaps but absent kernel drivers — they require Qualcomm-supplied BSP patches or
mainline kernel work beyond this project's scope.

Even if FastRPC were available, the V73 HVX performance ceiling for LLM decode is not
significantly above the CPU baseline. The 4× Cortex-A53 cores already use NEON vectorization
at 128-bit width; the HVX at 1024-bit offers an 8× vector advantage, but the DSP runs at
lower clock speeds, shares the same LPDDR4X bandwidth bottleneck, and would require custom
HVX-optimized GEMV kernels that do not exist in `ggml-qnn` today.

### 2.2 QRB5165N (Arduino Ventuno Q) — Hexagon 780 HTP

| Feature | Detail |
| :--- | :--- |
| Hexagon core | 780 with dedicated HTP (Hexagon Tensor Processor) |
| AI accelerator | **40 TOPS** — purpose-built INT8/INT4 matrix engine |
| CPU | 8-core Kryo Gen 6 (ARMv9) |
| Memory | 16 GB LPDDR5 |
| QNN SDK support | Native target; Android or embedded Linux via OE toolchain |
| ETA | Q2 2026 |

This is the chip QNN was designed for. The HTP executes quantized matrix multiplications in
dedicated hardware, entirely off the CPU and GPU pipelines. A Q4_0 Qwen3.5-0.8B model at 40
TOPS would have a theoretical decode ceiling of ~200 tok/s — roughly 45× the current Uno Q CPU
baseline.

---

## 3. `ggml-qnn` Backend: Current State

The QNN backend in mainline llama.cpp is under active development (see PR #12326). Its current
architecture:

```
llama.cpp
  └── ggml
       └── ggml-qnn/
            ├── ggml-qnn.h        — public backend interface
            ├── ggml-qnn.cpp      — backend registration, context init
            ├── qnn-lib.cpp       — dynamic load of libQnnHtp.so / libQnnCpu.so / libQnnGpu.so
            └── kernels/          — QNN op implementations (mat-mul, RoPE, etc.)
```

**Supported ops (as of b9014 era):** `GGML_OP_MUL_MAT`, `GGML_OP_ADD`, `GGML_OP_MUL`,
`GGML_OP_SOFT_MAX`, `GGML_OP_RMS_NORM`. The backend selectively offloads these to the HTP;
unsupported ops fall through to CPU automatically.

**Key limitation:** `ggml-qnn` dynamically loads `libQnnHtp.so` at runtime. This library is
part of the QNN SDK and is distributed only for Android (`arm64-v8a`) and a cross-compiled
OE Linux target. There is no pre-built `libQnnHtp.so` for Debian/glibc aarch64. Obtaining one
requires either:
(a) building the QNN SDK for `aarch64-oe-linux-gcc11.2` and cross-compiling a shim, or
(b) running the Android binary under a compatibility layer (not viable).

---

## 4. Feasibility Matrix

| Path | Chip | Blocker | Effort | ETA |
| :--- | :--- | :--- | :--- | :--- |
| `ggml-qnn` (HTP) on Uno Q | QRB2210 | No HTP on chip | N/A — impossible | — |
| Hexagon V73 HVX via FastRPC | QRB2210 | `/dev/fastrpc-*` missing; custom kernels needed | 6–12 months | Unlikely |
| `ggml-qnn` (HTP) on Ventuno Q | QRB5165N | Hardware not yet available | 2–3 months prep | Q3 2026 |
| CPU (Cortex-A53 NEON) | QRB2210 | None — already working | 0 | **Now** |

---

## 5. Recommended Tier 3 Strategy

### 5.1 Abandon QNN on Uno Q

There is no path to `ggml-qnn` on the QRB2210 within a reasonable timeframe. The QRB2210
is not a QNN-class device. The existing 4.43 tok/s CPU baseline is the production ceiling for
this chip without major BSP investment from Qualcomm or the kernel community.

The Uno Q evaluation series is effectively complete:
- CPU: **4.43 tok/s** (stable, production-ready)
- GPU (Wang OpenCL, p=1): **0.22 tok/s** (functionally working but 20× slower — not viable)
- All other GPU paths: blocked by hardware/driver limits

### 5.2 Prepare `ggml-qnn` for Ventuno Q (Start Now)

The Ventuno Q ships in Q2 2026. The `ggml-qnn` integration work should begin now so the
backend is validated and ready for day-one benchmarking. The preparation roadmap:

#### Phase 1: SDK Acquisition and Build System (2–3 weeks)

1. Download the Qualcomm AI Engine Direct SDK (`qnn-sdk-linux-aarch64-*.zip`) from
   `developer.qualcomm.com`. Target the `aarch64-oe-linux-gcc11.2` ABI.
2. Verify that `libQnnHtp.so`, `libQnnCpu.so`, and the QNN header set are present.
3. Add a `make sensai-qnn` build target to the Sensai Makefile that sets:
   ```
   -DGGML_QNN=ON
   -DQNN_SDK_PATH=<path>
   ```
4. Confirm the binary links without errors against the QNN stubs.

#### Phase 2: Model Conversion (1 week)

The QNN backend prefers FP16 or INT8 weights in a format-specific layout. The GGUF files
used today require no prior conversion for `ggml-qnn` — the backend handles quantized types
at the GGML layer. However, for peak HTP performance, QNN can consume pre-compiled `.bin`
context binaries (offline model compilation via `qnn-model-lib-generator`). This is optional
for initial testing but required for production latency targets.

#### Phase 3: First Boot Benchmark (day of hardware arrival)

Benchmark script targeting Ventuno Q:
```bash
# Set QNN_SDK_PATH and LD_LIBRARY_PATH to include libQnnHtp.so
export QNN_SDK_PATH=~/qnn-sdk
export LD_LIBRARY_PATH=$QNN_SDK_PATH/lib/aarch64-oe-linux-gcc11.2:$LD_LIBRARY_PATH

./yzma/lib/llama-bench \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf \
  -ngl 999 -t 4 -p 385 -n 128 -r 3 \
  --device QNN_HTP
```

Expected baseline for comparison:

| Metric | Uno Q CPU (achieved) | Ventuno Q HTP (target) |
| :--- | :--- | :--- |
| Decode (tg) | 4.43 tok/s | ~80–150 tok/s |
| Prefill (pp) | ~2.25s (385 tok) | <0.5s |
| TTFT | 2.25s | <0.5s |

#### Phase 4: yzma Integration

`yzma` does not currently expose a device-selection API to the Go layer. When `ggml-qnn` is
validated on Ventuno Q, add a `Device` field to `yzma`'s model load params:

```go
// pkg/llama/llama.go — extend ModelParams
type ModelParams struct {
    // ... existing fields ...
    Device string // "cpu", "qnn_htp", "qnn_gpu", "qnn_cpu"
}
```

Picoclaw/Sensai config then gains a `device` key under `llama_server`:
```json
"llama_server": {
  "device": "qnn_htp",
  "ngl": 999
}
```

---

## 6. Revised Tier Structure

Given the analysis above, the tier structure is revised as follows:

| Tier | Target | Status | Expected Gain |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Complete)** | Q6_K fallback, Wang OpenCL | ✓ Done | Decode works; 20× slower than CPU — **not viable for prod** |
| **Tier 2** | Vulkan Lite (Turnip, 16 KB tile patch) | Next on Uno Q | Possible 1.5–3× prefill improvement |
| **Tier 3A** | QNN/HTP on Ventuno Q | Prep now, execute Q3 2026 | 18–35× over Uno Q CPU baseline |
| **Tier 3B** | Hexagon V73 HVX on Uno Q | **Abandoned** | Blocked by BSP; effort exceeds benefit |

---

## 7. Tier 2 Remains the Correct Next Step for Uno Q

Before Ventuno Q hardware is available, Tier 2 (Vulkan Lite) should be the focus for Uno Q:

- **Target**: Patch `ggml-vulkan.cpp` to cap `GGML_VULKAN_BLOCK_SIZE` at 16 for devices
  with `maxComputeSharedMemorySize <= 16384`.
- **Why**: Turnip is a more mature, more efficient driver than RustiCL. The 16 KB shared
  memory wall is a tile-size problem, not a fundamental architectural limit.
- **Expected benefit**: Prefill acceleration (GPU parallelism on the Q4_K GEMM). Decode
  (tg) will remain memory-bandwidth bound, but TTFT improvement alone is meaningful for
  educational UX.
- **Risk**: Low. Vulkan shaders have deterministic execution — no TDR timeout class of bugs.

---

## 8. Next Steps

| Priority | Action | Owner |
| :--- | :--- | :--- |
| 1 | Implement Tier 2: Vulkan Lite tile-size patch on `sensai-NPU` branch | Sensai |
| 2 | Download QNN SDK and add `make sensai-qnn` build target | Sensai |
| 3 | Draft Ventuno Q day-one benchmark plan | Sensai |
| 4 | Track `ggml-qnn` PR #12326 for HTP op coverage improvements | Sensai |
