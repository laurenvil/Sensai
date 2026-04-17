**SUMMARY WHITEPAPER  —  v4.0  —  FINAL RESULTS + FUTURE DIRECTIONS**
**PicoClaw + Yzma/llama-server**
Fully Local Edge AI Assistant on Arduino Uno Q

**Benchmark Result:  4.50s end-to-end  |  10 completion tokens  |  0 reasoning tokens  |  4.43 tok/s generation**
*Improvement over baseline:  149x faster  |  98.8% token reduction  |  +243% generation throughput*

# **1. Final Benchmark Results**

The following table represents the definitive performance profile achieved after all optimizations from the v1 through v4 evaluation series were applied and verified via the live streaming dashboard.

| **Metric** | **v1 Baseline** | **v4 Final** | **Change** | **Conditions** |
| --- | --- | --- | --- | --- |
| **Total wall time** | **~671s** | **4.50s** | **↓ 149x** | **Solo, no_think active** |
| **Completion tokens** | **864** | **10** | **↓ 98.8%** | **Reasoning suppressed** |
| **Reasoning tokens** | **~850** | **0** | **↓ 100%** | **/no_think in system prompt** |
| **Generation throughput** | **1.29 tok/s** | **4.43 tok/s** | **↑ +243%** | **No swap + no reasoning** |
| **Prompt throughput** | **4.12 tok/s** | **6.12 tok/s** | **↑ +49%** | **Reduced memory pressure** |
| **Time to first token** | **~2.67s** | **2.25s** | **↓ 16%** | **Solo benchmark** |
| **ms per gen token** | **774 ms** | **225.8 ms** | **↓ 71%** | **10 tokens vs 864** |
| **KV cache memory** | **3,072 MiB** | **144 MiB** | **↓ 95.3%** | **ctx 12288, parallel 2** |
| **Total llama-server RAM** | **~4,566 MiB** | **~1,301 MiB** | **↓ 71.5%** | **Within 4 GB budget** |
| **Swap dependency** | **Yes** | **No** | **Eliminated** | **Major stability improvement** |

## **1.1 What Drove Each Improvement**

| **Change Applied** | **Impact** | **Mechanism** |
| --- | --- | --- |
| **--ctx-size 12288 (from 262144)** | **Memory: ↓ 95%** | **KV cache scales linearly with ctx window** |
| **--parallel 2 (from 4)** | **Memory: additional ↓ 50%** | **Fewer concurrent KV states** |
| **request_timeout 1200s (from 120s)** | **Stability: eliminated timeouts** | **Sufficient budget for reasoning mode responses** |
| **/no_think in SOUL.md system prompt** | **Latency: ↓ 98.8%** | **Suppressed 850+ reasoning tokens per response** |
| **Stopped gateway during benchmark** | **Throughput: ↑ 243%** | **Eliminated concurrent slot starvation** |

# **2. PicoClaw Gateway Overhead in Production**

The benchmark result of 4.50 seconds represents ideal conditions: solo operation with a fresh slot and no competing requests. When PicoClaw's gateway is running alongside llama-server, several overhead factors affect real-world Telegram response times. Understanding these is essential for setting accurate expectations.

## **2.1 The 4,024-Token System Prompt**

Every single LLM request made by PicoClaw includes a full system prompt assembled from five static workspace files read on every message. As confirmed by the DeepWiki documentation, all static context files — IDENTITY.md, SOUL.md, AGENTS.md, TOOLS.md, and USER.md — are concatenated and prepended to every request:

| **File** | **Est. Tokens** | **Content** |
| --- | --- | --- |
| **IDENTITY.md** | **~400** | **Agent name, role, version, capabilities overview** |
| **SOUL.md** | **~300** | **Personality, communication style, /no_think directive** |
| **AGENTS.md** | **~800** | **Behavior rules, tool usage protocols, safety guidelines** |
| **TOOLS.md** | **~1,800** | **Full tool schema documentation for all 13 tools** |
| **USER.md** | **~200** | **User preferences, timezone, language** |
| **Skills (6 loaded)** | **~524** | **Per-skill instructions and schemas** |
| **TOTAL baseline** | **~4,024** | **Loaded fresh on every request — irreducible minimum** |

This 4,024-token floor means that with n_ctx_seq = 6,144 per slot, only 2,120 tokens remain for actual conversation content. On first message in any session, the full 4,024-token system prompt must be processed from scratch at approximately 6-7 tok/s — approximately 575-670 seconds. Subsequent messages reuse the checkpoint, processing only the delta tokens since the last checkpoint.
**⚠  First message in a new session will always take 9-11 minutes for prompt processing alone at current throughput. This is the dominant latency factor in production and is architecturally unavoidable with the current system prompt size.**

## **2.2 Real-World Response Time Model**

The following model estimates end-to-end Telegram response times under realistic PicoClaw gateway conditions, with /no_think active:

| **Scenario** | **Prompt time** | **Generation** | **Total est.** |
| --- | --- | --- | --- |
| **First message (cold session)** | **~575s (4024 tok ÷ 7)** | **~4s (15 tok)** | **~10 min** |
| **2nd+ message (checkpoint hit, 50 delta)** | **~7s** | **~4s** | **~11s** |
| **2nd+ message (checkpoint hit, 200 delta)** | **~30s** | **~4s** | **~34s** |
| **Heartbeat iteration (tool loop, 5 iters)** | **~35s each × 5** | **~4s each × 5** | **~3-4 min** |
| **Spawn subagent solo (66 tok prompt)** | **~10s** | **~4s** | **~14s** |
| **Spawn subagent concurrent with main** | **~215s (starvation)** | **~480s** | **~11 min** |

**ℹ  The first-message cold start problem is the primary UX challenge. Users sending their first message after a session break will wait up to 10 minutes. This is a consequence of the 4,024-token system prompt, not the model speed.**

## **2.3 Confirmed PicoClaw Gateway Optimizations**

The following optimizations are available within PicoClaw's existing configuration and file system, sourced from the official documentation and DeepWiki reference:

### **Workspace File Trimming (Immediate, High ROI)**

TOOLS.md is the largest contributor at ~1,800 tokens. It contains full documentation for all 13 tools. For an embedded assistant that only uses a subset of tools regularly, trimming unused tool documentation directly reduces every request's token baseline:
nano ~/.picoclaw/workspace/TOOLS.md
Remove or shorten documentation for tools not used in your primary workflow. For example, if the assistant doesn't use web_search, exec, or vision tools, removing those sections could save 500-800 tokens — reducing first-message cold start from 575s to approximately 500s, and expanding usable conversation context from 2,120 to ~2,700 tokens per slot.

### **Disable Unused Skills**

6 skills are loaded and each contributes to the system prompt. Review installed skills and disable those not needed:
ls ~/.picoclaw/workspace/skills/
Each skill adds its own instructions and schemas to the system prompt. Disabling 3 of 6 skills could save ~250 tokens.

### **Reduce max_tool_iterations**

The current config defaults to max_tool_iterations: 10 or 20. Each iteration requires a full LLM round trip. For simple conversational use, setting this to 5 prevents runaway tool chains while still allowing multi-step operations like the heartbeat cycle:
"max_tool_iterations": 5

### **Heartbeat Interval Tuning**

The 30-minute heartbeat interval fires the full agent tool loop every half hour regardless of user activity. On a device where every LLM call carries significant compute cost, reducing heartbeat frequency to 60 minutes for low-activity periods saves approximately 2 full agent cycles per hour:
"heartbeat_interval_minutes": 60

### **Summarization Tuning**

Lower the summarization thresholds to aggressively compress conversation history, keeping the delta tokens small on subsequent turns:
"summarize_message_threshold": 5,
"summarize_token_percent": 40

### **Temperature for Brevity**

Lower temperature reduces response verbosity even with /no_think active:
"temperature": 0.3

# **3. Future Directions and Outlook**

## **3.1 Near-Term: System Prompt Compression**

The single highest-leverage future optimization is reducing the 4,024-token system prompt. There are three approaches, each with different tradeoffs:

| **Approach** | **Token Savings** | **Implementation** |
| --- | --- | --- |
| **Trim TOOLS.md to used tools only** | **500-800** | **Edit workspace file; remove unused tool docs** |
| **Compress AGENTS.md to bullet points** | **300-500** | **Replace verbose rules with terse directives** |
| **Disable 3 of 6 skills** | **~250** | **Remove skill files from workspace/skills/** |
| **Shorten IDENTITY.md** | **100-200** | **Remove boilerplate, keep name + role only** |
| **Total potential reduction** | **~1,150-1,750** | **System prompt: ~2,274-2,874 tokens** |

A 1,500-token reduction in system prompt size would reduce cold start time from ~575s to approximately 360s (6 minutes), and expand usable conversation context from 2,120 to 3,620 tokens per slot — a 70% increase in effective working memory.

## **3.2 Near-Term: Context Window Expansion**

The current --ctx-size 12288 with --parallel 2 provides 6,144 tokens per slot. Given the measured memory footprint of ~1.3 GB (well within the 4 GB budget), there is headroom to increase the context window:

| **Config** | **KV Cache** | **Per Slot** | **Notes** |
| --- | --- | --- | --- |
| **Current: ctx=12288, p=2** | **144 MiB** | **6,144 tok** | **~2,120 usable after system prompt** |
| **ctx=16384, p=2** | **192 MiB** | **8,192 tok** | **~4,168 usable — 2x improvement** |
| **ctx=24576, p=2** | **288 MiB** | **12,288 tok** | **~8,264 usable — 4x improvement** |
| **ctx=24576, p=3** | **432 MiB** | **8,192 tok** | **3 slots for spawn concurrency** |
| **Recommended next step** | **192 MiB** | **8,192 tok** | **ctx=16384, p=2: minimal cost, meaningful gain** |

## **3.3 Medium-Term: Spawn Serialization**

The concurrent slot starvation problem (0.06 tok/s when main agent and spawn subagent compete) requires architectural mitigation. Two approaches are viable without modifying PicoClaw source code:

- Sequential heartbeat tasks: Restructure HEARTBEAT.md to use Quick Tasks only (direct responses, no spawn). Move complex tasks requiring spawn to a separate, lower-frequency heartbeat or manual invocation. This prevents the main agent loop from competing with its own spawn children.
- Staggered spawn timing: Add delay instructions between spawn calls in HEARTBEAT.md task descriptions, e.g., 'spawn task A, wait for confirmation, then spawn task B.' The model will interpret this as sequential operations.
- Increase --parallel to 3 with higher ctx-size: A third slot provides a dedicated channel for spawn subagents while the main agent occupies slot 1 and a second conversation occupies slot 2. Memory cost is manageable within the 4 GB budget.

## **3.4 Medium-Term: Model Alternatives**

Qwen3.5-0.8B-Q6_K has been proven functional but carries architectural constraints from its hybrid SSM design (no speculative decoding, forced full prompt reprocessing on recurrent layers). Three model alternatives warrant evaluation:

| **Model** | **Size** | **Est. tok/s** | **Reasoning** | **Notes** |
| --- | --- | --- | --- | --- |
| **Qwen3.5-0.8B-Q6_K (current)** | **625 MiB** | **4.43** | **Optional** | **Hybrid SSM, no spec. decoding** |
| **Qwen2.5-0.5B-Instruct Q4_K_M** | **~250 MiB** | **~8-10** | **None** | **Pure transformer, faster prompt proc.** |
| **Qwen2.5-1.5B-Instruct Q4_K_M** | **~900 MiB** | **~5-7** | **None** | **Better quality, still fits in RAM** |
| **SmolLM2-360M-Instruct Q4_K_M** | **~200 MiB** | **~15+** | **None** | **Minimal, fastest, lower quality** |

All three alternatives are pure transformer models without the hybrid SSM architecture, meaning they support speculative decoding, have better KV cache reuse, and do not force full prompt reprocessing. The trade-off is potentially lower capability for complex reasoning tasks — though for a Telegram assistant use case, Qwen2.5-0.5B is widely reported as sufficient for conversational interactions and simple agentic tool use.

## **3.5 Long-Term: Yzma In-Process Mode**

The current deployment uses llama-server mode, where Yzma manages an external llama-server process that PicoClaw communicates with over HTTP. Yzma's primary design mode is in-process: loading llama.cpp directly into the same Go process using purego bindings, with no HTTP overhead.
A future integration path would be building a custom Go binary that embeds both a PicoClaw-compatible agent loop and Yzma's in-process inference, eliminating the HTTP/JSON serialization overhead entirely. This would reduce per-request overhead from ~2-3ms (HTTP round trip) to nanoseconds (direct function call). For short 10-15 token responses at 4.43 tok/s, this is a minor gain, but for the 4,024-token prompt processing phase it could eliminate batching delays caused by the HTTP server's scheduling logic.
**ℹ  This is a development effort, not a configuration change. It requires building a custom application using Yzma's Go API. The Arduino Uno Q is an officially supported Yzma deployment target as confirmed in PROJECTS.md.**

## **3.6 Long-Term: Prompt Caching Strategy**

The llama-server checkpoint system already provides partial prompt caching — checkpoints at ~3,512 tokens are saved and reused across turns. A more aggressive caching strategy would pre-warm the server's slot with the system prompt at startup, ensuring that the first user message in any session benefits from the cached system prompt rather than cold-starting.
This can be achieved by sending a warm-up request immediately after llama-server starts:
# Add to llama-server startup script:
sleep 5  # wait for server ready
curl -s http://127.0.0.1:8080/v1/chat/completions \
-H 'Content-Type: application/json' \
-d '{"model":"Qwen_Qwen3.5-0.8B-Q6_K.gguf",
"messages":[{"role":"system","content":"SYSTEM_PROMPT_HERE"},
{"role":"user","content":"ready"}],
"max_tokens":1}' > /dev/null
This forces llama-server to process and checkpoint the full system prompt during startup, so the first real user message only needs to process the new user turn delta — reducing cold start from ~575s to ~10s.

## **3.7 Long-Term: MCP Tool Integration**

PicoClaw v0.2.1 includes Model Context Protocol (MCP) server support. MCP allows tools to be served by external processes over a standardized protocol, enabling the agent to call tools on other devices on the network. For an Arduino Uno Q functioning as an onboard AI assistant, this opens several integration possibilities:
- Hardware sensor integration: MCP servers running on the Arduino's GPIO or I2C bus could expose temperature, humidity, camera, or accelerometer data as tools callable by the PicoClaw agent loop.
- Smart home integration: MCP servers on the local network could expose device control (lights, locks, HVAC) as tools, enabling the agent to act as a natural-language home automation interface.
- Multi-device agent mesh: Multiple Arduino Uno Q boards each running PicoClaw could form a local agent mesh, with each device's MCP server exposing specialized capabilities to the others.

# **4. Final Architecture Summary**

The following diagram-in-prose describes the complete optimized deployment as of March 15, 2026:

| **Layer** | **Description** |
| --- | --- |
| **Hardware** | **Arduino Uno Q  —  aarch64 / ARMv8.0 / 4 GB RAM / 4-core CPU** |
| **OS** | **Linux aarch64  —  kernel with NEON + ARM_FMA SIMD support** |
| **Inference** | **Yzma/llama-server b1-c96f608d  —  ctx=12288, parallel=2, loopback :8080** |
| **Model** | **Qwen3.5 0.8B Q6_K  —  625 MiB, hybrid SSM+attention, /no_think active** |
| **Agent** | **PicoClaw v0.2.1  —  13 tools, 6 skills, timeout=1200s, temp=0.3** |
| **Channel** | **Telegram  —  polling mode, single-user** |
| **Memory** | **~1.3 GB total  —  2.7 GB headroom  —  no swap** |
| **Response time** | **4.5s solo  —  11-35s with gateway overhead  —  10 min cold start** |
| **Throughput** | **4.43 tok/s generation  —  6.12 tok/s prompt (solo)** |

# **5. Recommended Next Steps (Priority Ordered)**

| **#** | **Action** | **Effort** | **Expected Outcome** |
| --- | --- | --- | --- |
| **1** | **Trim TOOLS.md to active tools only** | **30 min** | **Save 500-800 tokens; cold start ↓ to ~8 min** |
| **2** | **Increase to --ctx-size 16384** | **5 min** | **2x usable conversation context** |
| **3** | **Create daily memory file via heartbeat** | **10 min** | **Eliminate recurring read_file error** |
| **4** | **Add pre-warm curl to startup script** | **15 min** | **Cold start ↓ from 10 min to ~10s** |
| **5** | **Serialize heartbeat spawn tasks** | **20 min** | **Eliminate slot starvation on heartbeat** |
| **6** | **Regenerate Telegram bot token** | **2 min** | **Security: token appeared in tool call log** |
| **7** | **Benchmark Qwen2.5-0.5B Q4_K_M** | **1 hour** | **Validate faster pure-transformer alternative** |
| **8** | **Explore MCP sensor integration** | **Ongoing** | **Expand agent capabilities to hardware I/O** |

# **6. Conclusion**

This evaluation series — spanning four whitepaper versions over a single day of iterative testing — has taken the PicoClaw + Yzma/llama-server stack on the Arduino Uno Q from a broken deployment (11-minute timeouts, OOM pressure, no responses delivered) to a functionally validated, production-capable edge AI assistant achieving 4.50-second end-to-end response times in solo operation.
The journey required understanding three interacting systems: PicoClaw's workspace-driven context assembly (4,024-token system prompt), Yzma's llama-server as an OpenAI-compatible inference backend, and the Qwen3.5-0.8B hybrid SSM + attention model's unique architectural constraints. Each system contributed to the initial failures; fixing them in sequence produced the observed 149x improvement.
The remaining gap between the 4.50s solo benchmark and real-world 11-35s gateway responses is dominated by a single factor: the 4,024-token system prompt must be processed on every cold-start session. The pre-warm startup script (Section 3.6) and TOOLS.md compression (Section 3.1) together represent the most direct path to bridging this gap.
The Arduino Uno Q running a fully local, privacy-preserving AI agent with Telegram integration, autonomous heartbeat scheduling, async tool execution, and multi-skill support is no longer a proof of concept. It is a working system. The optimizations documented in this series are a repeatable playbook for deploying capable edge AI agents on $10-class embedded Linux hardware.

*End of Summary Whitepaper  |  v4.0  |  PicoClaw + Yzma/llama-server  |  Arduino Uno Q  |  March 15, 2026*
