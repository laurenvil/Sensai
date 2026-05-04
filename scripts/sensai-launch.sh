#!/usr/bin/env bash
# sensai-launch.sh — Start llama-server + gateway (background) then drop into
# Sensai terminal chat. Cleans up all child processes on exit.
set -euo pipefail

PICOCLAW_HOME="${PICOCLAW_HOME:-$HOME/.picoclaw}"
SENSAI_MODEL="${SENSAI_MODEL:-$HOME/models/Qwen_Qwen3.5-0.8B-Q4_0.gguf}"
LLAMA_SERVER="${LLAMA_SERVER:-./yzma/lib/llama-server}"
BINARY="${BINARY:-./build/picoclaw}"
LLAMA_PORT="${LLAMA_PORT:-8080}"
LLAMA_LOG="$PICOCLAW_HOME/llama-server.log"
GATEWAY_LOG="$PICOCLAW_HOME/gateway.log"
LLAMA_PID_FILE="$PICOCLAW_HOME/llama-server.pid"
GATEWAY_PID_FILE="$PICOCLAW_HOME/gateway.pid"

# ── Prerequisites ─────────────────────────────────────────────────────────────

if [ ! -f "$BINARY" ]; then
    echo "Error: Sensai binary not found at $BINARY"
    echo "Run: make build"
    exit 1
fi

if [ ! -f "$LLAMA_SERVER" ]; then
    echo "Error: llama-server not found at $LLAMA_SERVER"
    echo "Run: cd yzma && make download-llama.cpp"
    exit 1
fi

if [ ! -f "$SENSAI_MODEL" ]; then
    echo "Error: model not found at $SENSAI_MODEL"
    echo "Download it with:"
    echo "  mkdir -p ~/models"
    echo "  wget -O $SENSAI_MODEL \\"
    echo "    'https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q6_K.gguf'"
    exit 1
fi

if [ ! -f "$PICOCLAW_HOME/config.json" ]; then
    echo "Error: config not found at $PICOCLAW_HOME/config.json"
    echo "Run: make sensai-setup"
    exit 1
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────

cleanup() {
    echo ""
    echo "Stopping Sensai..."
    if [ -f "$LLAMA_PID_FILE" ]; then
        kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
        rm -f "$LLAMA_PID_FILE"
        echo "  Stopped llama-server"
    fi
    if [ -f "$GATEWAY_PID_FILE" ]; then
        kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
        rm -f "$GATEWAY_PID_FILE"
        echo "  Stopped gateway"
    fi
    echo "  Done. See you next time!"
}
trap cleanup EXIT INT TERM

# Kill any stale processes from a previous run
if [ -f "$LLAMA_PID_FILE" ]; then
    kill "$(cat "$LLAMA_PID_FILE")" 2>/dev/null || true
    rm -f "$LLAMA_PID_FILE"
fi
if [ -f "$GATEWAY_PID_FILE" ]; then
    kill "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null || true
    rm -f "$GATEWAY_PID_FILE"
fi

# ── llama-server ──────────────────────────────────────────────────────────────

echo "Starting llama-server (model: $(basename "$SENSAI_MODEL"))..."
"$LLAMA_SERVER" \
    -m "$SENSAI_MODEL" \
    --host 127.0.0.1 \
    --port "$LLAMA_PORT" \
    --ctx-size 4096 \
    --parallel 1 \
    -t 4 \
    --flash-attn on \
    --mlock \
    --cache-type-k q8_0 \
    --cache-type-v q8_0 \
    >> "$LLAMA_LOG" 2>&1 &
echo $! > "$LLAMA_PID_FILE"

echo "Waiting for llama-server to be ready..."
READY=0
for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${LLAMA_PORT}/v1/models" > /dev/null 2>&1; then
        READY=1
        echo "  Ready after ${i}s"
        break
    fi
    sleep 2
done

if [ "$READY" -eq 0 ]; then
    echo "Error: llama-server did not start within 60 seconds."
    echo "Check the log: $LLAMA_LOG"
    exit 1
fi

# ── Gateway (Telegram) ────────────────────────────────────────────────────────

# Start gateway only if a real Telegram token is configured
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
echo "  │  🧘  S  E  N  S  A  I                    │"
echo "  │      Arduino AI Assistant                  │"
echo "  │                                            │"
echo "  │  Type your question at 'You:' and press    │"
echo "  │  Enter. Sensai responds in a few seconds.  │"
echo "  │  Type 'exit' or Ctrl+C to quit.           │"
echo "  └───────────────────────────────────────────┘"
echo ""

"$BINARY" agent
