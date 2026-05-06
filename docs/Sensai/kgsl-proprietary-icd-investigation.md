# KGSL and Proprietary OpenCL ICD Investigation
## Adreno 702 / QRB2210 — Driver Stack Architecture, Availability, and Path Forward

**Date:** 2026-05-06
**Branch:** `sensai-gpu`
**Hardware:** Arduino Uno Q (QRB2210, Adreno 702 @ 845 MHz)
**Research scope:** Qualcomm docs, qualcomm-linux GitHub org, IWOCL 2025 proceedings, BSP package repos

---

## 1. Core Finding: The Two Driver Stacks Are Mutually Exclusive

The Arduino Uno Q Debian BSP does **not** ship with the Qualcomm proprietary OpenCL driver. This is not an oversight — it is a deliberate architectural split between two incompatible kernel interfaces:

| Stack | Kernel interface | OpenCL ICD | Present on Debian BSP |
|---|---|---|---|
| **Qualcomm proprietary** | `/dev/kgsl-3d0` (KGSL out-of-tree module) | `libOpenCL_adreno.so` | **No** |
| **Mainline Linux (our setup)** | `/dev/dri/renderD128` (DRM_MSM) | Mesa RustiCL | **Yes** |

The two stacks cannot coexist on the same kernel. Our Debian kernel uses DRM_MSM, so KGSL — and therefore the proprietary ICD — is structurally absent from the system. This is the root cause of `/dev/kgsl-3d0` not existing.

---

## 2. KGSL Source: Available but Wrong Stack

**Repository:** https://github.com/qualcomm-linux/kgsl
**License:** GPL-2.0
**Branch:** `gfx-kernel.le.0.0`

From the README (verbatim):
> "This repository contains the source code of KGSL driver for the Adreno family of GPUs. Required to use hardware accelerated OpenGL, compute and Vulkan on Qualcomm Snapdragon targets."

The repo covers A5xx, A6xx, Gen7, and Gen8 Adreno GPUs. The Adreno 702 falls within the A6xx family for driver purposes.

**Why this cannot simply be compiled and loaded:**

KGSL is an Android-lineage out-of-tree kernel module. It is the GPU driver used in Qualcomm's LE Yocto BSPs and Android-derived images. Mainline Linux uses DRM_MSM instead — these drivers implement different kernel interfaces for the same hardware and cannot both be loaded on the same running kernel.

Building KGSL for our Debian system would require:
1. A kernel with `CONFIG_DRM_MSM` disabled and KGSL's kernel ABI enabled
2. The full Qualcomm LE kernel tree (`qualcomm-linux/kernel`) rather than the upstream Debian kernel
3. The Android-derived userspace libraries that KGSL depends on (`libgsl.so`, `libcutils.so`, `libion.so`, etc.)

This is effectively a full BSP replacement, not a driver install.

---

## 3. Adreno 702 Support in Mainline Linux (DRM_MSM)

The A702 **is** supported in mainline Linux — but only via DRM_MSM, which feeds Mesa/Freedreno/RustiCL, not the proprietary ICD.

Support was merged via a **7-patch series by Konrad Dybcio**, submitted February 2024:
- https://www.mail-archive.com/dri-devel@lists.freedesktop.org/msg482809.html

The patch series added:
1. Device tree bindings for QCM2290 GPU clock controller (GPUCC)
2. `HUAYRA_2290` alpha-PLL clock support
3. QCM2290 GPUCC clock driver (`gpucc-qcm2290.c`, 423 lines)
4. Missing A702 register definitions
5. A702 GPU support in `a6xx_gpu.c` in DRM_MSM (~92 lines)
6. QCM2290 device tree GPU node
7. QRB2210-RB1 device tree: GPU enabled

The final DTS entry enabling the GPU:
```
&gpu {
    status = "okay";

    zap-shader {
        firmware-name = "qcom/qcm2290/a702_zap.mbn";
    };
};
```

The cover letter states: *"Needs mesa!27665 on the userland part, kmscube happily spins."*

### Required Firmware

The GPU cannot initialize under DRM_MSM without the ZAP shader firmware:

```
/lib/firmware/qcom/qcm2290/a702_zap.mbn
```

If this file is missing, the GPU will fail to bring up at boot and Mesa RustiCL will have no device to talk to. This is worth verifying on the board.

```bash
# Verify firmware is present
ls /lib/firmware/qcom/qcm2290/

# Verify GPU initialized at boot
dmesg | grep -i "adreno\|a702\|msm_gpu\|drm"

# Verify Mesa can see the OpenCL device
RUSTICL_ENABLE=freedreno clinfo | head -40
```

---

## 4. Proprietary `libOpenCL_adreno.so` — Not Publicly Available for Debian/QRB2210

The proprietary Qualcomm OpenCL ICD is distributed as `qti-adreno_*.deb` inside Qualcomm's proprietary BSP. The only confirmed working Linux case is:

**ModalAI VOXL2 (QRB5165 / Adreno 650)** — uses a full Qualcomm proprietary LE BSP with KGSL and `/dev/kgsl-3d0`. The packages required are:

```
qti-adreno_1.0-r0_arm64.deb     # OpenCL ICD + libOpenCL.so
libcutils0_0-r1_arm64.deb
libsync_1.0-r1_arm64.deb
qti-libion_0-r1_arm64.deb
liblog0_1.0-r1_arm64.deb
```

Required shared libraries:
- `libOpenCL.so`, `libCB.so`, `libgsl.so`, `liblog.so.0`
- `libcutils.so.0`, `libsync.so.0.0.0`, `libion.so.0.0.0`
- `libllvm-qcom.so`

Required device nodes: `/dev/kgsl-3d0`, `/dev/ion`

These packages are Android-derived and not distributed through any public Debian apt repository for QRB2210. The Qualcomm Package Manager (QPM) at https://qpm.qualcomm.com/#/main/tools/details/Adreno_OpenCL_SDK requires authentication and targets Android/AOSP and OE/Yocto builds primarily.

### The `qsc-deb-releases` Overlay Repo

The `qualcomm-linux/qcom-deb-images` repo references an internal apt overlay:
> "package delta that isn't fully upstreamed and backported to trixie"

This overlay (`qsc-deb-releases`) is the most likely distribution point for any proprietary GPU packages targeted at the Debian BSP. Its contents are not publicly indexed. Contact Arduino or Qualcomm directly about access.

---

## 5. Qualcomm's Own OpenCL llama.cpp Backend — Adreno 702 Not Yet Officially Supported

**Source:** Hongqiang Wang (Qualcomm GPU Research Team), IWOCL 2025, Heidelberg.

The slide deck (verbatim, Slide 10):
> "Performance tuned for premium Adreno GPUs (Adreno 700 and 800): Snapdragon Gen 1, 2, 3, Elite and X Elite (WoS)."
> "Support Android/Linux and Snapdragon® Elite and Snapdragon X Elite (WoS)."
> "Support selected Adreno 600 devices (like the Qualcomm Robotics **RB5**)."
> "**Ongoing optimization and porting for low tiers.**"

The **RB5 is QRB5165 (Adreno 650)**. The **RB1 is QRB2210 (Adreno 702)**. The Adreno 702 is explicitly in the "ongoing / low tier" category — not yet an officially validated target even with the proprietary ICD.

The IWOCL 2025 slide deck also confirms what features the proprietary stack unlocks that we are missing (Slide 16–17):

| Feature | RustiCL (our stack) | Proprietary ICD |
|---|---|---|
| `cl_khr_subgroups` | Not present for FD702 | Native — required by the backend |
| SVM zero-copy | Not present | Enabled — eliminates model RAM duplication |
| `cl_qcom_dot_product_8bit_integer` | Not present | In progress — hardware INT8 IDOT units |
| On-chip global memory (GMEM) | Not accessible | In progress |
| Recordable command buffer | Not present | In progress |

Performance achieved with the proprietary ICD on supported premium devices (Slide 14):

| Model | GPU | Prefill (t/s) | Generation (t/s) |
|---|---|---|---|
| Llama-2 7B | Adreno X Elite | 151 | 18 |
| Llama-2 7B | Adreno 830 (SD 8 Elite) | 155 | 15 |
| DeepSeek R1 1.5B | Adreno X Elite | 510 | 62 |
| DeepSeek R1 1.5B | Adreno 750 | 495 | 42 |

No Adreno 702 benchmark data is present in the deck.

---

## 6. qualcomm-linux GitHub Organization — Relevant Repos

| Repo | Relevance |
|---|---|
| [`qualcomm-linux/kgsl`](https://github.com/qualcomm-linux/kgsl) | KGSL kernel driver source (A-family GPUs, GPL-2.0, branch `gfx-kernel.le.0.0`) |
| [`qualcomm-linux/kernel`](https://github.com/qualcomm-linux/kernel) | Linux kernel for Qualcomm Linux Initiative (QLI) mainline |
| [`qualcomm-linux/kernel-topics`](https://github.com/qualcomm-linux/kernel-topics) | Tech topic branches for QLI mainline |
| [`qualcomm-linux/meta-qcom`](https://github.com/qualcomm-linux/meta-qcom) | OpenEmbedded/Yocto BSP layer; includes `recipes-graphics/` |
| [`qualcomm-linux/qcom-deb-images`](https://github.com/qualcomm-linux/qcom-deb-images) | Debian build scripts; supports QRB2210 RB1 explicitly; references `qsc-deb-releases` overlay apt repo |
| [`qualcomm-linux/build-guide`](https://github.com/qualcomm-linux/build-guide) | Build guide for QLI |

---

## 7. Summary Assessment

| Question | Answer |
|---|---|
| Did the Arduino Uno Q ship with a proprietary OpenCL driver? | **No** — the Debian BSP uses DRM_MSM (mainline), not KGSL (proprietary) |
| Does KGSL source exist for Adreno 702? | Yes — https://github.com/qualcomm-linux/kgsl |
| Can KGSL be loaded on the current Debian kernel? | **No** — incompatible with DRM_MSM; requires full kernel/BSP replacement |
| Is A702 support in mainline Linux? | Yes — merged Feb 2024 via DRM_MSM `a6xx_gpu.c` (Dybcio patch series) |
| Is the `a702_zap.mbn` firmware required? | Yes — must be at `/lib/firmware/qcom/qcm2290/a702_zap.mbn` for GPU to init |
| Is `libOpenCL_adreno.so` available for Debian/QRB2210? | **Not publicly** — requires Qualcomm proprietary BSP/KGSL stack |
| Is Adreno 702 officially supported by Qualcomm's OpenCL llama.cpp backend? | **Not yet** — listed as "ongoing / low tier" in IWOCL 2025; RB5 (Adreno 650) is supported |
| What does Mesa RustiCL give us today? | OpenCL 3.0 compute, no subgroups, no SVM, no INT8 dot-product, no GMEM |
| What would the proprietary ICD add? | Native subgroups, SVM zero-copy, INT8 IDOT, GMEM cache → projected 5–13× prefill speedup |
| What is the path to the proprietary ICD? | (A) Arduino/Qualcomm BSP update with `qsc-deb-releases` GPU packages, or (B) full kernel swap to KGSL-based build |
| Is the Mesa RustiCL path a workaround? | **No** — it is the correct and only supported path for the current Debian BSP |

---

## 8. Recommended Diagnostic Commands

Run these on the board to establish the current GPU state baseline:

```bash
# 1. Confirm GPU firmware is present (required for DRM_MSM init)
ls -la /lib/firmware/qcom/qcm2290/a702_zap.mbn

# 2. Confirm GPU initialized at boot
dmesg | grep -iE "adreno|a702|msm_gpu|drm|kgsl"

# 3. Confirm DRM render node exists
ls /dev/dri/

# 4. Confirm Mesa rusticl sees the FD702 device
RUSTICL_ENABLE=freedreno clinfo 2>&1 | grep -E "Platform|Device|Version|Subgroup"

# 5. Check if any Qualcomm ICD is installed
ls /etc/OpenCL/vendors/
cat /etc/OpenCL/vendors/*.icd 2>/dev/null

# 6. Check for kgsl-related packages (should be none on mainline Debian)
dpkg -l | grep -i "kgsl\|adreno\|qti"

# 7. Check qsc-deb-releases overlay apt source (if configured by Arduino BSP)
grep -r "qsc-deb" /etc/apt/sources.list /etc/apt/sources.list.d/ 2>/dev/null
```

---

## 9. Path Forward

### Near-term (no kernel change required)
- Continue with Mesa RustiCL (`make sensai-gpu`). It is the correct path for the Debian BSP.
- Verify `a702_zap.mbn` firmware is present and the GPU is actually initializing under DRM_MSM.
- Monitor Mesa upstream for `cl_khr_subgroups` support on Freedreno (tracked in Mesa 25.3+).

### Medium-term (contact Arduino/Qualcomm)
- Check whether Arduino's BSP team plans to distribute GPU firmware or `qti-adreno` packages via the `qsc-deb-releases` overlay repo (`qualcomm-linux/qcom-deb-images`).
- Request access to the Qualcomm Adreno OpenCL SDK via QPM: https://qpm.qualcomm.com/#/main/tools/details/Adreno_OpenCL_SDK

### Long-term (kernel replacement path)
- Build a KGSL-based kernel from `qualcomm-linux/kernel` + `qualcomm-linux/kgsl`.
- Obtain `qti-adreno` packages from Qualcomm's proprietary LE BSP.
- This enables the full proprietary ICD stack and the 5–13× prefill speedup projected in the March 2026 whitepaper — **if and when** Qualcomm validates the Adreno 702 as a supported target.

---

## 10. Key Sources

| Source | URL |
|---|---|
| KGSL kernel driver source | https://github.com/qualcomm-linux/kgsl |
| Qualcomm Debian images (qcom-deb-images) | https://github.com/qualcomm-linux/qcom-deb-images |
| Qualcomm Yocto BSP (meta-qcom) | https://github.com/qualcomm-linux/meta-qcom |
| A702 DRM/MSM patch series (Dybcio, Feb 2024) | https://www.mail-archive.com/dri-devel@lists.freedesktop.org/msg482809.html |
| A702 DTS patch (RB1 GPU enabled) | https://www.mail-archive.com/dri-devel@lists.freedesktop.org/msg482816.html |
| Armbian QRB2210 kernel v7.0 PR #9710 | https://github.com/armbian/build/pull/9710 |
| Debian kernel MR #1560 (RB1 boards) | https://salsa.debian.org/kernel-team/linux/-/merge_requests/1560 |
| 96Boards QRB2210 spec (OpenCL 2.0 confirmed) | https://www.96boards.org/product/qualcomm-robotics-rb1/ |
| ModalAI VOXL2 OpenCL in Docker (proprietary ICD example) | https://docs.modalai.com/voxl-2-opencl-in-docker/ |
| IWOCL 2025 — Wang/Qualcomm, llama.cpp OpenCL | https://www.iwocl.org/wp-content/uploads/iwocl-2025-hongqiang-wang-lamacpp-backend-update.pdf |
| Qualcomm Adreno OpenCL SDK (QPM, login required) | https://qpm.qualcomm.com/#/main/tools/details/Adreno_OpenCL_SDK |
| Qualcomm Linux Graphics Guide | https://docs.qualcomm.com/bundle/publicresource/topics/80-70022-19/graphics-overview.html |
