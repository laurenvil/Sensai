# Vulkan Progress Report 03: Overcoming the RAM Wall
**Date:** 2026-05-07
**Status:** In Progress (Shader Regeneration)

## 1. Summary
During the compilation of the "Vulkan Lite" source, we encountered a significant hardware bottleneck: the generated shader source files (specifically `mul_mm.comp.cpp`) reached **140 MB**, causing the C++ compiler to exceed the 4GB RAM + 2GB Swap limits of the Arduino Uno Q.

## 2. Engineering Solution: Strategic Feature Pruning
To ensure the build can complete on-device, we have manually patched the shader generator (`vulkan-shaders-gen.cpp`) to prune permutations that are not required for the Adreno 702:

- **Type Pruning**: Reduced `type_names` to the essential set for Sensai: `f32`, `f16`, `q4_0`, `q8_0`, `q4_k`, and `q6_k`. This removes over 20 unused quantization types.
- **Matrix Core Deactivation**: Disabled the generation of `coopmat` and `coopmat2` (matrix core) shaders. Since the Adreno 702 utilizes a unified shader architecture without dedicated tensor/matrix cores, these large permutations were redundant.
- **Resource Management**: Resumed the build with a strict `-j1` (single-threaded) execution to dedicate all available system memory and swap to the remaining compiler processes.

## 3. Current Activity
- **Regenerating Shaders**: The compiler is currently rebuilding the pruned shader generator.
- **Memory Health**: System RAM usage is currently stable at ~1.6 GB, well within the safe operational envelope.

## 4. Impact
These changes will result in a significantly smaller and more efficient `llama-server` binary, specifically tuned for the hardware capabilities of the Adreno 702, while ensuring build stability on the target device.
