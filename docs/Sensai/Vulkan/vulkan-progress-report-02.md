# Vulkan Progress Report 02: Transition to Source-Based Vulkan Lite
**Date:** 2026-05-07
**Status:** In Progress (Compiling)

## 1. Summary
Following the failure of the pre-built `b9049` binary on the Adreno 702 due to the 16 KB shared memory limit, we have pivoted to a source-based build. We have successfully applied surgical patches to the `llama.cpp` Vulkan backend to implement "Vulkan Lite" optimizations.

## 2. Key Technical Improvements (Patched)
We have modified `ggml-vulkan.cpp` with the following:
- **Automatic Tiling Override**: Detected the 16 KB hardware limit and forced the `s_warptile` (32x32) configuration for all matrix multiplication layers.
- **Graceful Error Handling**: Replaced hard runtime crashes with per-type disablement flags. This allows the system to fallback to CPU for unsupported tensors rather than failing the entire model load.
- **Improved Op Support**: Integrated shared memory availability checks directly into `ggml_backend_vk_device_supports_op`.
- **Flash Attention Guard**: Explicitly disabled Flash Attention on 16 KB devices to prevent "Out of Resources" GPU hangs.

## 3. Current Activity
- **Building**: Compiling the patched `llama-server` and `llama-bench` from source within the workspace (`vulkan-build-source/`).
- **Optimization**: Currently generating specialized Vulkan shaders.

## 4. Next Steps
1. Complete the build of `llama-server`.
2. Run `Vulkan Eval v1` benchmarks to compare throughput against the CPU baseline.
3. Verify stability of the automated CPU fallback for complex model architectures.
