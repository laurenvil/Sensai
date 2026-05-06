#!/usr/bin/env bash
# sensai-gpu-launch.sh — Start llama-server (Wang/OpenCL build) + gateway then drop into
# Sensai terminal chat. Uses the Adreno 702 GPU via Mesa/RustiCL (RUSTICL_ENABLE=freedreno).
#
# Prerequisites:
#   - Wang's llama.cpp built at $WANG_LLAMA_SERVER (default: ~/ArduinoApps/llama-wang/build/bin/llama-server)
#   - Pure Q4_0 model at $SENSAI_GPU_MODEL (default: ~/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf)
#   - Mesa rusticl support: apt install mesa-opencl-icd
#
# See docs/Sensai/opencl-gpu-improvement-roadmap.md for full context.
set -euo pipefail

PICOCLAW_HOME="${PICOCLAW_HOME:-$HOME/.picoclaw}"
SENSAI_GPU_MODEL="${SENSAI_GPU_MODEL:-$HOME/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf}"
WANG_LLAMA_SERVER="${WANG_LLAMA_SERVER:-$HOME/ArduinoApps/llama-wang/build/bin/llama-server}"
WANG_LIB_DIR="${WANG_LIB_DIR:-$(dirname "$WANG_LLAMA_SERVER")}"
BINARY="${BINARY:-./build/picoclaw}"
GPU_PORT="${GPU_PORT:-8080}"
LLAMA_LOG="$PICOCLAW_HOME/llama-gpu-server.log"
GATEWAY_LOG="$PICOCLAW_HOME/gateway.log"
LLAMA_PID_FILE="$PICOCLAW_HOME/llama-gpu-server.pid"
GATEWAY_PID_FILE="$PICOCLAW_HOME/gateway.pid"

# ── Prerequisites ─────────────────────────────────────────────────────────────

if [ ! -f "$BINARY" ]; then
    echo "Error: Sensai binary not found at $BINARY"
    echo "Run: make build"
    exit 1
fi

if [ ! -f "$WANG_LLAMA_SERVER" ]; then
    echo "Error: Wang's llama-server not found at $WANG_LLAMA_SERVER"
    echo ""
    echo "Build it from the Wang branch:"
    echo "  git clone https://github.com/wanghqc/llama.cpp -b opencl/nvidia ~/ArduinoApps/llama-wang"
    echo "  cd ~/ArduinoApps/llama-wang"
    echo "  cmake -B build -DGGML_OPENCL=ON -DCMAKE_BUILD_TYPE=Release"
    echo "  cmake --build build --target llama-server -j4"
    echo ""
    echo "See docs/Sensai/opencl-gpu-improvement-roadmap.md for patch details."
    exit 1
fi

if [ ! -f "$SENSAI_GPU_MODEL" ]; then
    echo "Error: GPU model not found at $SENSAI_GPU_MODEL"
    echo ""
    echo "Download it:"
    echo "  mkdir -p ~/models"
    echo "  wget -O \"$SENSAI_GPU_MODEL\" \\"
    echo "    'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf'"
    echo ""
    echo "Note: Use a pure Q4_0 model — Q6_K tensors cause CL_OUT_OF_RESOURCES on FD702."
    exit 1
fi

if [ ! -f "$PICOCLAW_HOME/config.json" ]; then
    echo "Error: config not found at $PICOCLAW_HOME/config.json"
    echo "Run: make sensai-setup"
    exit 1
fi

# Check Mesa rusticl is available
if ! clinfo 2>/dev/null | grep -qi "rusticl\|freedreno\|FD"; then
    echo "Warning: Mesa rusticl/Freedreno OpenCL device not detected by clinfo."
    echo "  Install: sudo apt install mesa-opencl-icd"
    echo "  The server will start anyway but GPU layers may fall back to CPU."
    echo ""
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────

cleanup() {
    echo ""
    echo "Stopping Sensai GPU..."
    if [ -f "$LLAMA_PID_FILE" ]; then
        kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
        rm -f "$LLAMA_PID_FILE"
        echo "  Stopped llama-server (GPU)"
    fi
    if [ -f "$GATEWAY_PID_FILE" ]; then
        kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
        rm -f "$GATEWAY_PID_FILE"
        echo "  Stopped gateway"
    fi
    echo "  Done. See you next time!"
}
trap cleanup EXIT INT TERM

# Kill any stale GPU server processes from a previous run
if [ -f "$LLAMA_PID_FILE" ]; then
    kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
    rm -f "$LLAMA_PID_FILE"
fi
if [ -f "$GATEWAY_PID_FILE" ]; then
    kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
    rm -f "$GATEWAY_PID_FILE"
fi

# ── llama-server (GPU / Wang-branch) ──────────────────────────────────────────
#
# Key flags for Adreno 702 / Mesa RustiCL stability:
#   -ngl 999          — offload all layers to GPU (let supports_op() filter Q6_K to CPU)
#   --no-flash-attn   — flash-attn kernel exceeds 16 KB local mem limit on FD702
#   --ctx-size 512    — keep batch within single-CU GPU watchdog budget (~5s TDR limit)
#   -t 2              — minimal CPU threads (GPU does the heavy lifting)
#   --parallel 1      — single request queue to avoid context fragmentation
#
# Environment:
#   RUSTICL_ENABLE=freedreno  — tells Mesa to activate the rusticl CL runtime for FD702
#   MESA_OPENCL_OVERRIDE=1    — suppress "no CL driver" warnings from other Mesa devices
#   LD_LIBRARY_PATH           — Wang-branch OpenCL runtime libs (libggml-opencl.so etc.)

echo "Starting llama-server GPU (model: $(basename "$SENSAI_GPU_MODEL"))..."
echo "  Binary : $WANG_LLAMA_SERVER"
echo "  Log    : $LLAMA_LOG"
RUSTICL_ENABLE=freedreno \
MESA_OPENCL_OVERRIDE=1 \
LD_LIBRARY_PATH="$WANG_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    "$WANG_LLAMA_SERVER" \
        -m "$SENSAI_GPU_MODEL" \
        --host 127.0.0.1 \
        --port "$GPU_PORT" \
        --ctx-size 512 \
        --parallel 1 \
        -t 2 \
        -ngl 999 \
        --no-flash-attn \
        >> "$LLAMA_LOG" 2>&1 &
echo $! > "$LLAMA_PID_FILE"

echo "Waiting for GPU llama-server to be ready (up to 120s — GPU model load is slow)..."
READY=0
for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${GPU_PORT}/v1/models" > /dev/null 2>&1; then
        READY=1
        echo "  Ready after $((i * 2))s"
        break
    fi
    sleep 2
done

if [ "$READY" -eq 0 ]; then
    echo "Error: GPU llama-server did not start within 120 seconds."
    echo "Check the log: $LLAMA_LOG"
    echo ""
    echo "Common causes:"
    echo "  - Mesa rusticl not found: install mesa-opencl-icd"
    echo "  - Model has Q6_K tensors: use a pure Q4_0 model"
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
echo "  │  🧘  S  E  N  S  A  I  [GPU]              │"
echo "  │      Arduino AI Assistant                  │"
echo "  │      Adreno 702 · Mesa RustiCL             │"
echo "  │                                            │"
echo "  │  Type your question at 'You:' and press    │"
echo "  │  Enter. Sensai responds in a few seconds.  │"
echo "  │  Type 'exit' or Ctrl+C to quit.           │"
echo "  └───────────────────────────────────────────┘"
echo ""

"$BINARY" agent
