#!/usr/bin/env python3
"""
llama-server streaming dashboard
Usage: python3 llama_dash.py [prompt]
       python3 llama_dash.py "/no_think hi"
"""

import json
import sys
import time
import urllib.request
import urllib.error
import os

# ── config ────────────────────────────────────────────────────────────────────
HOST      = "http://127.0.0.1:8080"
MODEL     = "Qwen_Qwen3.5-0.8B-Q6_K.gguf"
PROMPT    = sys.argv[1] if len(sys.argv) > 1 else "/no_think hi"
WIDTH     = int(os.get_terminal_size().columns) if sys.stdout.isatty() else 80

# ── ANSI colours ──────────────────────────────────────────────────────────────
R  = "\033[0m"          # reset
B  = "\033[1m"          # bold
DIM= "\033[2m"          # dim
CY = "\033[96m"         # cyan        – thinking tokens
GR = "\033[92m"         # green       – generated tokens
YL = "\033[93m"         # yellow      – labels
MG = "\033[95m"         # magenta     – metrics values
BL = "\033[94m"         # blue        – section headers
RD = "\033[91m"         # red         – warnings
WH = "\033[97m"         # white       – prompt

def hr(char="─", colour=BL):
    print(f"{colour}{char * WIDTH}{R}")

def header(title):
    pad = (WIDTH - len(title) - 2) // 2
    print(f"{BL}{'─' * pad} {B}{title}{R}{BL} {'─' * (WIDTH - pad - len(title) - 2)}{R}")

def metric(label, value, unit="", warn=False):
    col = RD if warn else MG
    print(f"  {YL}{label:<30}{R}{col}{B}{value}{R}{DIM} {unit}{R}")

# ── fetch server info ─────────────────────────────────────────────────────────
def get_server_info():
    try:
        with urllib.request.urlopen(f"{HOST}/health", timeout=3) as r:
            health = json.loads(r.read())
        with urllib.request.urlopen(f"{HOST}/slots", timeout=3) as r:
            slots = json.loads(r.read())
        return health, slots
    except Exception as e:
        return {"status": f"error: {e}"}, []

# ── stream request ────────────────────────────────────────────────────────────
def stream(prompt):
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True
    }).encode()

    req = urllib.request.Request(
        f"{HOST}/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    thinking_tokens = []
    answer_tokens   = []
    in_think        = False
    usage           = {}
    timings         = {}
    t_start         = time.time()
    t_first_token   = None
    chunk_count     = 0

    header("STREAMING OUTPUT")
    print(f"\n  {YL}Prompt :{R} {WH}{prompt}{R}\n")
    hr("·", DIM)
    print(f"\n  {CY}{B}[THINKING]{R}", end="", flush=True)

    with urllib.request.urlopen(req) as resp:
        for raw_line in resp:
            line = raw_line.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break

            try:
                obj = json.loads(data)
            except json.JSONDecodeError:
                continue

            chunk_count += 1

            # extract delta
            delta = obj.get("choices", [{}])[0].get("delta", {})
            think = delta.get("reasoning_content") or ""
            text  = delta.get("content") or ""

            # usage + timings live in the final chunk
            if "usage" in obj:
                usage = obj["usage"]
            if "timings" in obj:
                timings = obj["timings"]

            # track first token latency
            if (think or text) and t_first_token is None:
                t_first_token = time.time() - t_start

            # thinking tokens
            if think:
                in_think = True
                thinking_tokens.append(think)
                print(f"{CY}{think}{R}", end="", flush=True)

            # switch label when answer begins
            if text and in_think:
                in_think = False
                print(f"\n\n  {GR}{B}[ANSWER]{R}", end="", flush=True)
            elif text and not in_think and not thinking_tokens:
                # no thinking mode – just answer
                if not answer_tokens:
                    print(f"\n\n  {GR}{B}[ANSWER]{R}", end="", flush=True)

            if text:
                answer_tokens.append(text)
                print(f"{GR}{text}{R}", end="", flush=True)

    t_total = time.time() - t_start
    print("\n")
    return thinking_tokens, answer_tokens, usage, timings, t_first_token, t_total, chunk_count

# ── main ──────────────────────────────────────────────────────────────────────
def main():
    os.system("clear")

    # ── banner ────────────────────────────────────────────────────────────────
    hr("═")
    title = "  llama-server · PicoClaw Eval Dashboard"
    print(f"{BL}{B}{title}{R}")
    print(f"{DIM}  {HOST}  |  {MODEL}{R}")
    hr("═")
    print()

    # ── pre-flight server info ────────────────────────────────────────────────
    header("SERVER STATUS")
    health, slots = get_server_info()
    print(f"\n  {YL}Health :{R} {GR if health.get('status')=='ok' else RD}{health.get('status','unknown')}{R}")
    if slots:
        for s in slots:
            sid   = s.get("id", "?")
            state = s.get("state", "?")
            ntok  = s.get("n_past", 0)
            col   = YL if state != "idle" else GR
            print(f"  {YL}Slot {sid}  :{R} {col}{state:<10}{R}{DIM}  {ntok} tokens cached{R}")
    print()

    # ── stream ────────────────────────────────────────────────────────────────
    think_toks, ans_toks, usage, timings, ttft, t_total, chunks = stream(PROMPT)

    # ── metrics ───────────────────────────────────────────────────────────────
    hr()
    header("METRICS")
    print()

    # token counts
    prompt_n  = usage.get("prompt_tokens", timings.get("prompt_n", "?"))
    comp_n    = usage.get("completion_tokens", timings.get("predicted_n", "?"))
    total_n   = usage.get("total_tokens", "?")
    think_n   = len("".join(think_toks).split())  # approx word count
    ans_n     = len("".join(ans_toks).split())

    metric("Prompt tokens",        prompt_n,  "tokens")
    metric("Completion tokens",    comp_n,    "tokens",
           warn=isinstance(comp_n, int) and comp_n > 500)
    metric("Total tokens",         total_n,   "tokens")
    metric("Thinking word count",  think_n,   "words (approx)",
           warn=think_n > 200)
    metric("Answer word count",    ans_n,     "words")
    print()

    # timing from llama-server timings object
    if timings:
        pp_ms  = timings.get("prompt_ms", 0)
        pp_n   = timings.get("prompt_n", 1)
        ev_ms  = timings.get("predicted_ms", 0)
        ev_n   = timings.get("predicted_n", 1)
        pp_tps = timings.get("prompt_per_second", 0)
        ev_tps = timings.get("predicted_per_second", 0)

        metric("Prompt eval time",     f"{pp_ms/1000:.2f}", "s")
        metric("Prompt throughput",    f"{pp_tps:.2f}",     "tok/s")
        metric("Generation time",      f"{ev_ms/1000:.2f}", "s",
               warn=ev_ms > 120000)
        metric("Generation throughput",f"{ev_tps:.2f}",     "tok/s",
               warn=isinstance(ev_tps, float) and ev_tps < 1.5)
        metric("ms / gen token",       f"{ev_ms/ev_n:.1f}" if ev_n else "?", "ms")
    print()

    # wall-clock
    metric("Time to first token",  f"{ttft:.2f}" if ttft else "?", "s")
    metric("Total wall time",      f"{t_total:.2f}", "s")
    metric("SSE chunks received",  chunks, "")
    print()

    # reasoning mode detection
    hr("·", DIM)
    if think_toks:
        print(f"\n  {RD}{B}⚠  Reasoning mode ACTIVE{R}{RD} — thinking tokens consumed {comp_n} of total budget{R}")
        print(f"  {DIM}Add /no_think to prompt or set it in SOUL.md to disable{R}\n")
    else:
        print(f"\n  {GR}{B}✓  Reasoning mode INACTIVE{R}{GR} — no thinking tokens generated{R}\n")

    # post-flight slot state
    header("SLOT STATE (POST-REQUEST)")
    _, slots_after = get_server_info()
    if slots_after:
        for s in slots_after:
            sid   = s.get("id", "?")
            state = s.get("state", "?")
            ntok  = s.get("n_past", 0)
            sim   = s.get("prompt_cache_hit", None)
            col   = YL if state != "idle" else GR
            extra = f"  cache hit: {sim}" if sim is not None else ""
            print(f"\n  {YL}Slot {sid}  :{R} {col}{state:<10}{R}{DIM}  {ntok} tokens cached{extra}{R}")
    print()
    hr("═")
    print(f"{DIM}  Done.  Model: {MODEL}  |  Host: {HOST}{R}")
    hr("═")

if __name__ == "__main__":
    main()
