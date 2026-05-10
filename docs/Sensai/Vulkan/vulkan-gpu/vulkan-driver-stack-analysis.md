# Vulkan Driver Stack on Arduino Uno Q — Clarification

**Date:** 2026-05-10
**Branch:** `sensai-gpu-vulkan-v2`
**Subject:** Did the Adreno 702 already ship with Vulkan? What is the "Vulkan Adreno Layer"? Did we use the right driver?

---

## Context

After reviewing `vulkan-lite-feasibility-study.md`, `vulkan-implementation-plan.md`, `vulkan-gpu/whitepaper.md`, `eval/gpu/vulkan-eval-v1.md`, and `eval/gpu/wave-concurrency-analysis.md`, a question arose about whether we should have used a Vulkan binary that came preinstalled with the Adreno, hinted at in the [Arduino forum thread on the Linux graphics stack](https://forum.arduino.cc/t/linux-graphics-stack-on-the-arduino-uno-q/1430713), and whether the [Qualcomm Vulkan Adreno Layer](https://docs.qualcomm.com/doc/80-78185-2/topic/vk_adreno_layer.html) applies to our case.

This document records the answer.

---

## 1. Yes — the Uno Q already has the Vulkan driver for the Adreno 702 installed

`vulkaninfo --summary` on the Uno Q reports:

```
GPU0: Turnip Adreno (TM) 702
  driverID    = DRIVER_ID_MESA_TURNIP
  driverName  = turnip Mesa driver
  driverInfo  = Mesa 25.2.6-1~bpo13+1
  apiVersion  = 1.0.318
```

Relevant packages installed by the Debian Trixie BSP / repo:

- `libvulkan1` 1.4.309 — the Vulkan **loader** (`libvulkan.so.1`)
- `libvulkan-dev` 1.4.309 — headers
- `mesa-vulkan-drivers` 25.2.6 — provides the **ICDs** (`/usr/share/vulkan/icd.d/freedreno_icd.json` → `libvulkan_freedreno.so`)
- `vulkan-tools` — `vulkaninfo` etc.

The Arduino forum thread confirms this in passing: it states that WebGPU uses "the **tulip** [Turnip] Vulkan driver of the Adreno 702 GPU." Turnip is the open-source Mesa Vulkan driver for Adreno (the Vulkan counterpart to Freedreno's GL driver).

## 2. We are already using it — there is no separate "Vulkan binary preinstalled with the Adreno"

There's a category confusion worth untangling, because it's the source of the doubt:

| Layer | What it is | Where it comes from on Uno Q |
|---|---|---|
| **Vulkan loader** (`libvulkan.so.1`) | Generic dispatch lib; every Vulkan app links to this | Debian package `libvulkan1` (preinstalled) |
| **Vulkan ICD / driver** (`libvulkan_freedreno.so`) | The actual GPU driver that talks to the Adreno hardware | Debian package `mesa-vulkan-drivers` (preinstalled) |
| **Vulkan application** (e.g. `llama-server`) | Compiled C++/Go program that *uses* Vulkan via the loader | Built locally **or** downloaded (the `hybridgroup/llama-cpp-builder` tarball) |

`vulkan-implementation-plan.md` already sets `VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json` (lines 119, 195, 213). That **is** the preinstalled Vulkan driver. The hybridgroup tarball didn't ship a driver — it shipped an `llama-server` *application* built against Vulkan, which then calls into the system loader, which loads Mesa Turnip. So driver-wise, we did the right thing.

The benchmark numbers in `vulkan-eval-v1.md` (1.0 t/s prefill, wave-concurrency wall, 16 KB shared-memory wall) are **not** explained by "wrong Vulkan." They're explained by Adreno 702 hardware limits (1 Compute Unit, ~16 KB shared mem, low register file) interacting with mainline llama.cpp shaders that were tuned for desktop GPUs. The wave-concurrency analysis is correct on that point.

## 3. Vulkan API — the short version

Vulkan is a low-level, explicit cross-vendor GPU API (graphics + compute) maintained by Khronos. Compared to OpenCL:

- **Compute shaders** (GLSL → SPIR-V) replace OpenCL kernels.
- **Specialization constants** let host code patch shader constants (tile sizes etc.) at pipeline-creation time without rebuilding GLSL — this is the mechanism the Vulkan Lite feasibility study leans on.
- **Subgroup ops** (`Shuffle`, `Ballot`, `Arithmetic`) expose native SIMD-lane reductions — Mesa Turnip exposes them on Adreno; RustiCL does not.

For our purposes Vulkan matters because (a) the loader/driver split means the system has a working Adreno path out of the box, and (b) llama.cpp's Vulkan backend is far more actively maintained than its OpenCL backend.

## 4. The "Vulkan Adreno Layer" — does NOT apply to us

A Vulkan **layer** is an optional intercept module that sits *between* the application and the ICD — used for validation, debugging, profiling, frame capture, etc. (`VK_LAYER_KHRONOS_validation`, `VK_LAYER_MESA_overlay`, etc.) Layers are toggled per run via `VK_INSTANCE_LAYERS` or `vkEnumerateInstanceLayerProperties`. They are never required to run a Vulkan application.

The Qualcomm "Vulkan Adreno Layer" is part of the Adreno GPU SDK / Snapdragon Profiler tooling — a debug/profiling layer for Snapdragon Android developers, used to instrument apps and feed data to Qualcomm's profilers. It is:

- **Optional** (debug/profile only — not a driver, not a perf accelerator)
- **Targeted at Android / Snapdragon devkit workflows**, not Debian Linux on the Uno Q
- **Proprietary**, distributed with Qualcomm's SDK (analogous to the proprietary KGSL OpenCL ICD documented in `kgsl-proprietary-icd-investigation.md`)

For our case it's the same story as the proprietary OpenCL ICD: it isn't shipped with the Debian Uno Q BSP, and even if you obtained it, it would be a **profiling tool**, not a path to faster inference. It would not replace Mesa Turnip and would not move the t/s number.

## 5. TL;DR

- Vulkan **was** already installed on the Uno Q (Mesa Turnip via `mesa-vulkan-drivers`), and our launch script **is** using it via `freedreno_icd.json`. Nothing was wrong on the driver side.
- The hybridgroup tarball was an **app binary**, not a driver — choosing it vs. building locally is orthogonal to which Vulkan driver loads.
- The performance/occupancy issues are Adreno-702 architectural limits, not a wrong-driver problem.
- The "Vulkan Adreno Layer" is a Qualcomm proprietary **debug/profiling layer for Android**. Not applicable to Debian on Uno Q, and not a performance feature even where it does apply.

---
*This document is part of the Sensai Documentation Suite.*
