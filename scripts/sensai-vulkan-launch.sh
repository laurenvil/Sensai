#!/usr/bin/env bash
# sensai-vulkan-launch.sh — Start llama-server (Vulkan/Turnip build) + gateway then drop into
# Sensai terminal chat. Uses the Adreno 702 via Mesa Turnip (Vulkan).
#
# Prerequisites:
#   - Vulkan llama-server at $VULKAN_LLAMA_SERVER (default: yzma/lib-vulkan/llama-server)
#   - Download: make sensai-vulkan-download  (hybridgroup llama-b9049-bin-ubuntu-trixie-vulkan-arm64)
#   - mesa-vulkan-drivers installed (provides Turnip ICD for Adreno 702)
#   - Q4_0 model at $SENSAI_GPU_MODEL
#
# See docs/Sensai/Vulkan/vulkan-implementation-plan.md for the full implementation plan.
set -euo pipefail

PICOCLAW_HOME="${PICOCLAW_HOME:-$HOME/.picoclaw}"
SENSAI_GPU_MODEL="${SENSAI_GPU_MODEL:-$HOME/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
VULKAN_LLAMA_SERVER="${VULKAN_LLAMA_SERVER:-$REPO_ROOT/yzma/lib-vulkan/llama-server}"
VULKAN_LIB_DIR="${VULKAN_LIB_DIR:-$REPO_ROOT/yzma/lib-vulkan}"
BINARY="${BINARY:-./build/picoclaw}"
VULKAN_PORT="${VULKAN_PORT:-8080}"
LLAMA_LOG="$PICOCLAW_HOME/llama-vulkan-server.log"
GATEWAY_LOG="$PICOCLAW_HOME/gateway.log"
LLAMA_PID_FILE="$PICOCLAW_HOME/llama-vulkan-server.pid"
GATEWAY_PID_FILE="$PICOCLAW_HOME/gateway.pid"

# ── Prerequisites ─────────────────────────────────────────────────────────────

if [ ! -f "$BINARY" ]; then
    echo "Error: Sensai binary not found at $BINARY"
    echo "Run: make build"
    exit 1
fi

if [ ! -f "$VULKAN_LLAMA_SERVER" ]; then
    echo "Error: Vulkan llama-server not found at $VULKAN_LLAMA_SERVER"
    echo ""
    echo "Download it with:"
    echo "  make sensai-vulkan-download"
    echo ""
    echo "This fetches llama-b9049-bin-ubuntu-trixie-vulkan-arm64 from"
    echo "hybridgroup/llama-cpp-builder via yzma into yzma/lib-vulkan/."
    echo ""
    echo "See docs/Sensai/Vulkan/vulkan-implementation-plan.md for details."
    exit 1
fi

if [ ! -f "$SENSAI_GPU_MODEL" ]; then
    echo "Error: GPU model not found at $SENSAI_GPU_MODEL"
    echo ""
    echo "Download it:"
    echo "  mkdir -p ~/models"
    echo "  wget -O \"$SENSAI_GPU_MODEL\" \\"
    echo "    'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf'"
    exit 1
fi

if [ ! -f "$PICOCLAW_HOME/config.json" ]; then
    echo "Error: config not found at $PICOCLAW_HOME/config.json"
    echo "Run: make sensai-setup"
    exit 1
fi

# Check Mesa Turnip Vulkan ICD is available
if ! vulkaninfo 2>/dev/null | grep -qi "Turnip\|Adreno"; then
    echo "Warning: Mesa Turnip Vulkan device not detected."
    echo "  Install: sudo apt install mesa-vulkan-drivers"
    echo "  The server will start anyway but may use llvmpipe (CPU) instead of GPU."
    echo ""
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────

cleanup() {
    echo ""
    echo "Stopping Sensai Vulkan..."
    if [ -f "$LLAMA_PID_FILE" ]; then
        kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
        rm -f "$LLAMA_PID_FILE"
        echo "  Stopped llama-server (Vulkan)"
    fi
    if [ -f "$GATEWAY_PID_FILE" ]; then
        kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
        rm -f "$GATEWAY_PID_FILE"
        echo "  Stopped gateway"
    fi
    echo "  Done. See you next time!"
}
trap cleanup EXIT INT TERM

# Kill stale processes from a previous run
if [ -f "$LLAMA_PID_FILE" ]; then
    kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
    rm -f "$LLAMA_PID_FILE"
fi
if [ -f "$GATEWAY_PID_FILE" ]; then
    kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
    rm -f "$GATEWAY_PID_FILE"
fi

# ── llama-server (Vulkan / Mesa Turnip) ───────────────────────────────────────
#
# Binary: hybridgroup/llama-cpp-builder llama-b9049-bin-ubuntu-trixie-vulkan-arm64
# downloaded via yzma into yzma/lib-vulkan/llama-server.
#
# Key flags for Adreno 702 / Mesa Turnip stability:
#   -ngl 999          — offload all layers to GPU (Q4_0 s_warptile=4.2 KB fits 16 KB limit)
#   --no-flash-attn   — FA kernel can exceed 16 KB shared mem limit on FD702
#   --ctx-size 512    — keep batch within single-CU GPU watchdog budget (~5 s TDR limit)
#   -t 2              — minimal CPU threads (GPU does the heavy lifting)
#   --parallel 1      — single request queue to avoid context fragmentation
#
# Environment:
#   VK_ICD_FILENAMES  — force Mesa Turnip (freedreno) ICD; avoids llvmpipe fallback
#   LD_LIBRARY_PATH   — yzma/lib-vulkan runtime libs (libggml-vulkan.so etc.)
#
# 16 KB shared memory constraint (Adreno 702 / FD702):
#   - l_warptile (16.9 KB) is auto-rejected by the existing shmem check in llama.cpp
#   - s_warptile (4.2 KB) and m_warptile (8.4 KB) are within limit for Q4_0
#   - IQ1 types are skipped by the Vulkan Lite patch (see vulkan-implementation-plan.md)

echo "Starting llama-server Vulkan (model: $(basename "$SENSAI_GPU_MODEL"))..."
echo "  Binary : $VULKAN_LLAMA_SERVER"
echo "  Log    : $LLAMA_LOG"
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/freedreno_icd.json \
LD_LIBRARY_PATH="$VULKAN_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    "$VULKAN_LLAMA_SERVER" \
        -m "$SENSAI_GPU_MODEL" \
        --host 127.0.0.1 \
        --port "$VULKAN_PORT" \
        --ctx-size 512 \
        --parallel 1 \
        -t 2 \
        -ngl 999 \
        --no-flash-attn \
        >> "$LLAMA_LOG" 2>&1 &
echo $! > "$LLAMA_PID_FILE"

echo "Waiting for Vulkan llama-server to be ready (up to 120s — GPU model load is slow)..."
READY=0
for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${VULKAN_PORT}/v1/models" > /dev/null 2>&1; then
        READY=1
        echo "  Ready after $((i * 2))s"
        break
    fi
    sleep 2
done

if [ "$READY" -eq 0 ]; then
    echo "Error: Vulkan llama-server did not start within 120 seconds."
    echo "Check the log: $LLAMA_LOG"
    echo ""
    echo "Common causes:"
    echo "  - Mesa Turnip not found: install mesa-vulkan-drivers"
    echo "  - libggml-vulkan.so missing: rebuild with cmake -DGGML_VULKAN=ON"
    echo "  - GPU TDR timeout: reduce --ctx-size further"
    exit 1
fi

# ── Gateway (Telegram) ────────────────────────────────────────────────────────

if grep -q '"token"' "$PICOCLAW_HOME/config.json" && \
   ! grep -q 'YOUR_TELEGRAM_BOT_TOKEN' "$PICOCLAW_HOME/config.json"; then
    echo "Starting Sensai gateway (Telegram)..."
    "$BINARY" gateway >> "$GATEWAY_LOG" 2>&1 &
    echo $! > "$GATEWAY_PID_FILE"
    sleep 1
    echo "  Gateway running — message your bot from Telegram"
else
    echo "  Telegram not configured — skipping gateway"
    echo "  (Set token in $PICOCLAW_HOME/config.json to enable)"
fi

# ── Terminal Chat ─────────────────────────────────────────────────────────────

echo ""
echo "  ┌───────────────────────────────────────────┐"
echo "  │  🧘  S  E  N  S  A  I  [Vulkan]           │"
echo "  │      Arduino AI Assistant                  │"
echo "  │      Adreno 702 · Mesa Turnip              │"
echo "  │                                            │"
echo "  │  Type your question at 'You:' and press    │"
echo "  │  Enter. Sensai responds in a few seconds.  │"
echo "  │  Type 'exit' or Ctrl+C to quit.           │"
echo "  └───────────────────────────────────────────┘"
echo ""

"$BINARY" agent
