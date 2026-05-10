# Sensai Vulkan v2 — Implementation Result

**Date:** 2026-05-10
**Branch:** `sensai-gpu-vulkan-v2`
**Status:** Build complete, binary deployed, smoke-tested.

---

## Final state on `sensai-gpu-vulkan-v2`

| Component | Status |
|---|---|
| Fresh `llama.cpp` clone at b9049 in `~/ArduinoApps/llama-vulkan-v2/` | ✅ |
| 6-file source patch (139 lines) | ✅ saved as `docs/Sensai/Vulkan/vulkan-gpu/sensai-vulkan-v2.patch` |
| `llama-server` (8.7 MB), `llama-bench`, `libggml-vulkan.so` (16 MB) staged in `yzma/lib-vulkan/` | ✅ |
| `--list-devices` reports `Turnip Adreno (TM) 702` | ✅ |
| Model load smoke test (Qwen3.5-0.8B-Q4_0) | ✅ no crash, pipelines initialize |

## Key empirical findings (now in the plan)

- The 140 MB `mul_mm.comp.cpp` is real on b9049 too — the previous whitepaper was correct, the
  mid-build "1.7 MB" reading was misleading because it was the post-trim file. Without trim,
  cc1plus on it OOMs even at `-j1 -O0`.
- The **stub-emission approach** works: trimmed permutations get `_len = 0; _data[1] = {0};`
  instead of being dropped, so host-code symbols still link. `mul_mm.comp.cpp` 140 MB → 2.0 MB
  (70×).
- Per-source compile flags
  `-O0 -g0 -fno-var-tracking-assignments --param=ggc-min-expand=1 --param=ggc-min-heapsize=1`
  are needed for `mul_mat_vec.comp.cpp` (13 MB), but the stub trim handles `mul_mm.comp.cpp`.
- `GGML_VULKAN_SENSAI_TRIM=ON` is **required** for on-device build, not optional — corrected in
  the plan.

## Smoke-test output

```
ggml_vulkan: Found 1 Vulkan devices:
ggml_vulkan: 0 = Turnip Adreno (TM) 702 (turnip Mesa driver) | uma: 1 | fp16: 1 | bf16: 0 |
              warp size: 32 | shared memory: 16384 | int dot: 0 | matrix cores: none
load_backend: loaded CPU backend from yzma/lib-vulkan/libggml-cpu-armv8.0_1.so
```

Confirms the device is detected via Mesa Turnip and the patch's runtime assumptions hold:
- `warp size: 32` matches the BLOCK_SIZE=32 host override
- `shared memory: 16384` matches the 16 KB s_warptile forcing trigger
- `matrix cores: none` matches the coopmat stub strategy

## Next step

Build is ready for benchmarking via `make sensai-vulkan` whenever a comparison run against the
v4.4 OpenCL / CPU baseline is wanted. Results should be written to
`docs/Sensai/eval/gpu/vulkan-eval-v2.md`.

---
*This document is part of the Sensai Documentation Suite.*
