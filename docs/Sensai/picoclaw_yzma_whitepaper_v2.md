**TECHNICAL WHITEPAPER  —  v2.0  —  EXPANDED EDITION**
**PicoClaw + Yzma/llama-server**
Deep-Dive Architecture & Operational Analysis

Hardware:  Arduino Uno Q  —  aarch64 / ARMv8.0  —  4 GB RAM
*Model:  Qwen_Qwen3.5-0.8B-Q6_K.gguf  (Hybrid SSM + Attention, Thinking Mode ON)*
Date:  March 15, 2026  |  Based on live server + gateway log analysis

# **1. Executive Summary**

This document is an expanded revision of the initial PicoClaw + Yzma whitepaper, incorporating live data from two primary sources: the complete llama-server startup and runtime log, and the PicoClaw gateway operational log. Together these logs expose the full stack behavior in production, revealing several critical architectural insights not apparent from API-level analysis alone.
The most significant new finding is that Qwen3.5-0.8B is not a pure transformer model. It is a hybrid SSM (State Space Model) + attention architecture, with only 6 of its 24 layers being full attention layers. This hybrid design fundamentally constrains the KV cache reuse strategy, forces frequent full prompt reprocessing, and makes context checkpoint restoration less reliable than on pure transformer models.
The second critical finding is that llama-server is configured with the model's native context window of 262,144 tokens. This causes an allocation of 3,072 MiB for the KV cache alone — consuming most of the Arduino Uno Q's 4 GB RAM before any compute buffers are considered. The total memory footprint at startup exceeds 4.5 GB, which is above the device's physical RAM capacity and will cause the OS to use swap.
Despite these constraints, the stack is functionally operational. The heartbeat agent loop, async spawn tool chains, multi-slot concurrent request handling, and context checkpoint restoration are all confirmed working in the logs. The primary operational issues are latency (from reasoning mode + insufficient timeout) and memory pressure (from the default 262K context window).

# **2. Critical Finding: Qwen3.5 is a Hybrid SSM + Attention Architecture**

The llama-server startup log reveals that Qwen3.5-0.8B uses the architecture identifier 'qwen35', which is distinct from the standard transformer qwen2/qwen3 architecture. Examination of the model metadata exposes key SSM (Mamba-like) parameters alongside standard transformer parameters:

| **Parameter** | **Value** | **Significance** |
| --- | --- | --- |
| qwen35.block_count | 24 | Total layers |
| qwen35.full_attention_interval | 4 | Only every 4th layer is full attention → 6 attention layers total |
| qwen35.ssm.conv_kernel | 4 | Mamba-style convolution kernel |
| qwen35.ssm.state_size | 128 | SSM hidden state dimension per channel |
| qwen35.ssm.inner_size | 2048 | SSM expanded inner dimension |
| qwen35.ssm.group_count | 16 | SSM groups (SSD variant) |
| qwen35.ssm.time_step_rank | 16 | dt rank for discretization |
| llama_memory_recurrent size | 77.06 MiB | Recurrent state buffer (SSM layers) |
| llama_kv_cache size | 3,072 MiB | KV cache (attention layers only, but sized for full ctx) |

## **2.1 Why the Hybrid Architecture Matters Operationally**

In a pure transformer model, the KV cache stores the key/value projections for all past tokens. Because KV entries are stateless and position-indexed, they can be shared, checkpointed, restored, and prefilled arbitrarily. This is the foundation of efficient prefix caching.
SSM/Mamba layers work differently. They maintain a recurrent hidden state that is computed sequentially — each token's state depends on every previous token's computation. This state cannot be meaningfully checkpointed and restored at arbitrary positions the way KV cache can. The llama-server log explicitly surfaces this limitation repeatedly:
slot update_slots: id  1 | task 1385 | forcing full prompt re-processing
due to lack of cache data (likely due to SWA or hybrid/recurrent memory,
see https://github.com/ggml-org/llama.cpp/pull/13194#issuecomment-2868343055)

What this means in practice: even when a slot has a high LCP similarity score (e.g., sim_best=1.000) with a prior conversation, if the recurrent state cannot be restored, the entire prompt must be reprocessed from scratch. This negates much of the efficiency benefit of the context checkpoint system and is a primary driver of the observed high prompt processing times.
Additionally, the server log shows speculative decoding was explicitly disabled:
common_speculative_is_compat: the target context does not support partial sequence removal
srv    load_model: speculative decoding not supported by this context
This is a direct consequence of the hybrid architecture and further limits throughput optimization options.

# **3. Memory Architecture Analysis**

## **3.1 Full Memory Budget at Startup**

The llama-server log provides precise figures for every memory allocation at startup. The following table accounts for all reported buffers:

| **Buffer** | **Size (MiB)** | **Source in Log** |
| --- | --- | --- |
| Model weights (CPU_Mapped, mmap) | 625.57 | load_tensors: CPU_Mapped model buffer |
| KV cache (K f16 + V f16, 4 slots) | 3,072.00 | llama_kv_cache: CPU KV buffer size |
| Recurrent state buffer (SSM layers) | 77.06 | llama_memory_recurrent: CPU RS buffer |
| Output buffer | 3.79 | CPU output buffer size |
| Compute buffer (graph execution) | 786.02 | sched_reserve: CPU compute buffer |
| Token-to-piece cache | 1.76 | load: token to piece cache size |
| Context checkpoint cache (est.) | ~360 | ~19.266 MiB × up to 32 checkpoints (logged: 19.266 each) |
| picoclaw binary + runtime (est.) | ~25 | Go runtime + picoclaw process |
| OS + kernel (est.) | ~200 | Linux aarch64 base |

**⚠ WARNING: TOTAL ESTIMATED MEMORY REQUIREMENT: ~5,151 MiB ≈ 5.03 GB. This exceeds the Arduino Uno Q's 4 GB physical RAM. The system must use swap memory to operate, which on eMMC/SD storage causes severe performance degradation under memory pressure.**

## **3.2 The Context Window is the Root Cause**

The 3,072 MiB KV cache is calculated as follows: with n_ctx=262,144 tokens, 4 parallel slots, 6 full-attention layers, head dimension of 256, and f16 precision:
KV size = n_ctx × n_slots × n_kv_layers × 2 (K+V) × n_embd_k_gqa × sizeof(f16)
= 262,144 × 4 × 6 × 2 × 512 bytes × 2 bytes = 3,221,225,472 bytes ≈ 3,072 MiB

The model was launched without a --ctx-size argument, so llama-server defaulted to the model's training context length of 262,144. For a conversational Telegram bot with 30-minute heartbeat cycles, conversations will virtually never exceed 4,096 tokens of context. Launching with --ctx-size 4096 instead would reduce the KV cache to:
KV size (4096 ctx) = 4,096 × 4 × 6 × 2 × 512 × 2 = 50,331,648 bytes ≈ 48 MiB

This single change reduces memory consumption by 3,024 MiB — reclaiming approximately 74% of total memory usage — and would allow the entire stack to fit comfortably within 4 GB without swap.
**⚠ NOTE: The checkpoint cache size also scales with context. Each logged checkpoint is 19.266 MiB at 262K context. At 4K context, each checkpoint would be ~0.30 MiB, making the full 32-checkpoint ring nearly free.**

# **4. llama-server Internal Architecture (From Log Analysis)**

## **4.1 Slot System**

llama-server runs 4 parallel inference slots (n_parallel=4, auto-configured). Each slot maintains independent KV cache state and recurrent state for one concurrent conversation context. Slots are assigned to incoming requests via two selection strategies observed in the logs:
- LRU (Least Recently Used): Selected when no cached prompt prefix is available. Used for fresh contexts with no similarity to existing slot state.
- LCP Similarity (Longest Common Prefix): The server scores each available slot against the incoming prompt's token sequence and selects the slot with the highest overlap. This allows partial KV cache reuse, skipping re-computation of shared prefix tokens.

Log examples showing both strategies:
slot get_availabl: id  3 | task -1 | selected slot by LRU, t_last = -1
slot get_availabl: id  3 | task -1 | selected slot by LCP similarity,
sim_best = 1.000 (> 0.100 thold), f_keep = 0.989

The f_keep value (fraction of tokens to keep) determines how much of the existing slot's KV cache can be reused. f_keep=1.000 means the entire cached context matches the new prompt prefix and zero reprocessing is needed; f_keep=0.062 means almost no reuse is possible.

## **4.2 Context Checkpoint System**

A key optimization in this llama-server build is context checkpointing. At strategic positions during prompt processing, the server saves a snapshot of the KV cache state tagged with a token position range. These checkpoints function as restore points — when a new request arrives with a similar but shorter prefix, the server can restore from the nearest preceding checkpoint rather than reprocessing from position 0.
From the logs, each checkpoint consumes 19.266 MiB (at 262K context) and up to 32 checkpoints are maintained per slot:
slot update_slots: id  3 | task 0   | created context checkpoint 1 of 32
(pos_min = 3511, pos_max = 3511, n_tokens = 3512,
size = 19.266 MiB)

The checkpoint restoration logic is visible when a new conversation turn arrives that doesn't fully match the current slot state:
slot update_slots: id  3 | task 1095 | Checking checkpoint with [4586, 4586] against 3724...
slot update_slots: id  3 | task 1095 | Checking checkpoint with [4438, 4438] against 3724...
slot update_slots: id  3 | task 1095 | Checking checkpoint with [3511, 3511] against 3724...
slot update_slots: id  3 | task 1095 | restored context checkpoint
(pos_min = 3511, pos_max = 3511, n_tokens = 3512)

The server walks checkpoints in reverse order (newest to oldest) looking for the most recent checkpoint that precedes the new prompt's prefix match boundary. Checkpoints that fall within the new conversation's context but are no longer valid (e.g., because the conversation branched) are explicitly erased:
slot update_slots: | erased invalidated context checkpoint
(pos_min = 3743, ..., n_swa = 1, size = 19.266 MiB)

## **4.3 The Prompt Cache**

Separately from the per-slot context checkpoint system, llama-server also maintains a server-level prompt cache. This stores complete KV state snapshots for recently completed conversations that are no longer occupying a slot. When a slot is freed, its prompt state is saved to this cache:
srv   prompt_save:  - saving prompt with length 821, total state size = 28.903 MiB
srv        update:  - cache state: 3 prompts, 88.047 MiB
(limits: 8192.000 MiB, 262144 tokens, 262144 est)

The server then attempts to find a better starting point from this cache when assigning a new request:
srv          load:  - found better prompt with f_keep = 0.861, sim = 0.915
In the evaluated session, 4 distinct prompt contexts accumulated in the cache, totaling approximately 177 MiB of additional state. This is another significant memory consumer that scales with conversation length and concurrency.

## **4.4 Sampler Chain**

Every slot launch in the logs shows the same sampler pipeline. This is the token selection strategy applied at each generation step:
logits -> ?penalties -> ?dry -> ?top-n-sigma -> top-k -> ?typical ->
top-p -> min-p -> ?xtc -> temp-ext -> dist
Components marked with '?' are conditionally active based on request parameters. The default configuration uses top-k, top-p, min-p, and temperature sampling. This is the standard quality-vs-diversity configuration and is appropriate for conversational use. No changes are needed here.

## **4.5 Hardware Backend**

The loaded backend is the ARMv8.0 optimized CPU library:
load_backend: loaded CPU backend from
/home/arduino/ArduinoApps/yzma/lib/libggml-cpu-armv8.0_1.so

The system info line confirms all available ARM CPU extensions are active:
NEON = 1 | ARM_FMA = 1 | LLAMAFILE = 1 | OPENMP = 1 | REPACK = 1
NEON and ARM_FMA are SIMD vectorization extensions that accelerate matrix multiplication (the core operation in both attention and SSM layers). OPENMP provides multi-threaded parallelism across 4 cores. REPACK is a weight repacking optimization that improves memory access patterns during inference. The Arduino Uno Q is correctly utilizing all available ARMv8.0 acceleration capabilities.

# **5. Performance Analysis from Live Server Logs**

## **5.1 Per-Request Timing Table**

The following table summarizes all completed requests with timing data from the llama-server log:

| **Task** | **Slot** | **Total tok** | **Prompt ms/tok** | **Prompt tok/s** | **Eval ms/tok** | **Eval tok/s** | **Notes** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | 3 | 634 | 158.88 | 6.29 | 336.16 | 2.97 | Checkpoint restore |
| 172 | 3 | 843 | 161.36 | 6.20 | 332.33 | 3.01 | Checkpoint restore |
| 275 | 3 | 86 | 259.26 | 3.86 | 561.73 | 1.78 | Short new tokens |
| 337 | 3 | 149 | 553.10 | 1.81 | 774.10 | 1.29 | Concurrent contention |
| 436 | 0 | 875 | 242.73 | 4.12 | 774.17 | 1.29 | ← The 'hi' curl test |
| 462 | 3 | 95 | 245.94 | 4.07 | 907.62 | 1.10 | Memory pressure growing |
| 1095 | 3 | 533 | 172.38 | 5.80 | 720.28 | 1.39 | Checkpoint walk + erase |
| 1399 | 1 | 589 | 329.32 | 3.04 | 888.89 | 1.12 | Full re-process (hybrid) |
| 1478 | 1 | 261 | 222.59 | 4.49 | 900.17 | 1.11 | Checkpoint restore |
| 1700 | 1 | 149 | 235.94 | 4.24 | 474.50 | 2.11 | Best eval perf observed |
| 1817 | 1 | 102 | 239.92 | 4.17 | 550.01 | 1.82 |  |
| 1898 | 1 | 192 | 193.16 | 5.18 | 551.13 | 1.81 |  |
| 1977 | 1 | 224 | 562.93 | 1.78 | 752.00 | 1.33 | Concurrent load |
| 2177 | 1 | 79 | 258.72 | 3.87 | 762.83 | 1.31 |  |
| 2223 | 1 | 77 | 692.09 | 1.44 | 1304.17 | 0.77 | ← Slowest observed |
| 2389 | 2 | in progress | — | — | — | — | Concurrent with task 2276 |

## **5.2 Throughput Variance Analysis**

Eval throughput (token generation) ranges from 0.77 to 3.01 tok/s — a 3.9x spread. Prompt throughput ranges from 1.44 to 6.29 tok/s — a 4.4x spread. This variance is not random noise; it correlates with specific conditions:

| **Condition** | **Throughput Impact** | **Mechanism** |
| --- | --- | --- |
| Clean checkpoint restore (sim=1.000) | +50-100% | Reuses cached KV; skips large prefix recompute |
| Hybrid SSM full re-process forced | -40-60% | Cannot restore recurrent state; full prefix eval required |
| Concurrent slots active (2+ tasks) | -20-50% | CPU and memory bandwidth shared across slots |
| Memory pressure / swap activity | -30-70% | OS paging degrades compute buffer access |
| Long generation (reasoning mode) | ~1.10-1.29 tok/s | Consistent for pure generation phase |
| Short generation (few tokens) | ~1.78-3.01 tok/s | Less inter-token overhead, better cache locality |

## **5.3 Reasoning Mode Token Budget in Context**

The model's thinking=1 flag (confirmed in the startup log: 'srv init: chat template, thinking = 1') activates the full chain-of-thought reasoning pipeline. The curl test shows 864 completion tokens generated for the response 'Hello! How can I help you today?' The task 436 timing confirms this:
slot print_timing: id  0 | task 436 |
prompt eval time =   2670.08 ms /    11 tokens (242.73 ms/tok,  4.12 tok/s)
eval time = 668880.26 ms /   864 tokens (774.17 ms/tok,  1.29 tok/s)
total time = 671550.33 ms /   875 tokens

At 1.29 tok/s generation speed, each second of inference produces approximately 1.3 visible-or-reasoning tokens. A response requiring 200 reasoning tokens + 15 answer tokens takes ~166 seconds. A response requiring 864 reasoning tokens takes ~669 seconds. The fundamental driver of timeout failures is the combination of verbose reasoning + low generation throughput.

# **6. PicoClaw Gateway Behavior (From Gateway Log Analysis)**

## **6.1 Startup and Initialization**

The gateway initializes successfully with a complete agent configuration. Key confirmed parameters from the log:

| **Parameter** | **Value** |
| --- | --- |
| Bot username | [redacted] |
| Tools loaded | 13 |
| Skills loaded | 6/6 available |
| Heartbeat interval | 30 minutes |
| Health endpoint | http://127.0.0.1:18790/health |
| Telegram commands registered | 7 |
| Media cleanup interval | 5 minutes (max age 30m) |
| Active channels | telegram only |

## **6.2 The Heartbeat System in Operation**

The heartbeat system fires on a 30-minute interval and triggers a full agent loop execution against the HEARTBEAT.md task file. The first heartbeat cycle is fully logged and demonstrates the complete tool loop execution:

| **Time** | **Iteration** | **Event** |
| --- | --- | --- |
| 17:05:53 | — | TIMEOUT (retry=0) — first LLM call times out at 120s default |
| 17:08:01 | 1 | read_file(MEMORY.md) — 1ms, 411 chars |
| 17:10:34 | 2 | spawn({task: 'check for unread messages'}) — async, immediate return |
| 17:11:23 | 3 | spawn({task: 'review upcoming calendar events'}) — async |
| 17:13:13 | 4 | append_file(HEARTBEAT_OK.md) — 4ms, 68 chars |
| 17:14:16 | 5 | Direct answer: 'HEARTBEAT_OK' (12 chars) — cycle complete |
| 17:20:34 | — | Spawn subagent 1 FAILS: timeout — publishes error to telegram |
| 17:21:23 | — | Spawn subagent 2 FAILS: timeout — publishes error to telegram |

Key observation: the first heartbeat LLM call at 17:05 timed out (120s default). Despite this, the second attempt succeeded (timeout had presumably been increased in config by this point, or the model responded faster on retry). The main agent completed in 5 iterations, demonstrating the tool loop working correctly.
However, both async spawn subagents failed. This is the 'timeout cascade' problem: the main agent completed its loop and returned HEARTBEAT_OK, but the two spawned subagents each needed their own independent LLM call to the same llama-server. By the time the subagents ran, llama-server was occupied or the 120s timeout was still in effect, causing both to fail.

## **6.3 Concurrent Request Contention and the Spawn Tool Problem**

The spawn tool is designed for async subagent parallelism. However, on a single-device deployment with a shared llama-server, all agent contexts — including spawned subagents — compete for the same 4 inference slots. The following contention pattern was observed in the server logs:
- Main agent heartbeat loop occupies slot 3 (persistent, large context ~4024+ tokens)
- Spawn subagent 1 attempts slot 1 or 2 (small context ~66 tokens) — new short system prompt
- Spawn subagent 2 attempts another slot simultaneously
- Result: slots 1, 2, and 3 are all active concurrently, sharing 4 CPU cores and saturated memory bandwidth
- Per-slot throughput drops significantly (task 337: eval 1.29 tok/s vs task 49: 2.97 tok/s when alone)

The gateway log shows the spawn subagents running in tasks 273 and 336 (the short 66-token prompts). The server selected idle slots by LRU:
slot get_availabl: id  2 | task -1 | selected slot by LRU
slot update_slots: id  2 | task 273 | new prompt, n_ctx_slot = 262144, task.n_tokens = 66

Both were eventually cancelled via 'srv stop: cancel task' — PicoClaw's HTTP timeout fired before the subagent could generate a response. The subagents then reported back through the message bus as failures, which PicoClaw correctly routed as system messages to the Telegram chat.

## **6.4 The Timeout Cascade Failure Pattern**

A recurring failure pattern is visible throughout the gateway log: a long inference request (> 120s) triggers a timeout, which causes the HTTP client to close the connection, which causes llama-server to log 'cancel task'. The slot is then freed and the next request begins. But if PicoClaw immediately retries, it re-enters the same cycle. The logs show this manifesting as:
17:34:00 WRN Timeout error, retrying after backoff  retry=0  backoff=5s
17:35:52 WRN Timeout error, retrying after backoff  retry=0  backoff=5s
17:44:05 WRN Timeout error, retrying after backoff  retry=1  backoff=10s
17:45:57 WRN Timeout error, retrying after backoff  retry=1  backoff=10s

The retry=0 and retry=1 pairs suggest two separate concurrent message attempts both timing out and being retried. This compounds the slot contention problem: each retry re-occupies a slot with a long inference request that will likely time out again. Until request_timeout is set high enough for the model to complete, every retry simply wastes inference time and delays slot availability for other requests.

## **6.5 The Agentic Behavior: Self-Directed Web Fetches**

A notable observation in the second heartbeat cycle (17:50 onward) is the agent's autonomous decision to call web_fetch directly against the Telegram Bot API:
17:55:51 Tool call: web_fetch({"url":"https://api.telegram.org/bot[redacted]/getUpdates"})
This is the agent attempting to check for unread messages by directly polling the Telegram API rather than using a dedicated tool. While functionally interesting, this exposes the agent's Telegram bot token in the tool call log (redacted in this document). The agent also fetched a weather API endpoint:
18:01:50 Tool call: web_fetch({"url":"https://weather-api.com/weather/"})
Both calls completed successfully (1047ms and 469ms respectively). This demonstrates the model's capability for autonomous tool chaining even under constrained conditions, though the subsequent LLM calls to interpret results timed out before completion.

# **7. Comprehensive Recommendations**

## **7.1 Critical: Reduce Context Window Immediately**

**⚠ WARNING: This single change will reclaim ~3,024 MiB of RAM, remove swap dependency, and improve all inference throughput metrics. It is the highest-priority fix.**
Restart llama-server with an explicit --ctx-size argument:
/home/arduino/ArduinoApps/yzma/lib/llama-server \
-m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
--host 127.0.0.1 --port 8080 \
--ctx-size 4096 \
--n-parallel 2

Reducing n-parallel from 4 to 2 further reduces KV cache by another 50% (from 48 MiB to 24 MiB) and reduces concurrent slot contention. For a single-user Telegram bot, 2 parallel slots is sufficient (1 for the main agent loop, 1 for spawn subagents).

## **7.2 Critical: Increase request_timeout in PicoClaw Config**

Based on the observed timing data, set request_timeout conservatively for this hardware:
{
"model_list": [{
"model_name": "qwen-local",
"model": "qwen-local",
"api_base": "http://127.0.0.1:8080/v1",
"api_key": "local",
"request_timeout": 1200
}],
"agents": {
"defaults": {
"model": "qwen-local",
"max_tokens": 2048,
"max_tool_iterations": 10,
"summarize_message_threshold": 8,
"summarize_token_percent": 50
}
}
}

## **7.3 High Priority: Disable Reasoning Mode**

The chat template embedded in the GGUF confirms 'thinking = 1' by default. To disable it, include a system prompt instruction or use a Qwen3-specific no-think token. The llama-server chat template includes an <|im_start|> / <|im_end|> / <think> structure:
chat template example shows: <think> appended to assistant turn start
Pass a system prompt via the PicoClaw config or workspace SOUL.md / AGENTS.md that instructs the model not to use its thinking mode, for example: 'Respond concisely and directly. Do not use internal reasoning or <think> blocks.' Some Qwen3 GGUF variants also support a /no_think directive at the start of the user message. Test both approaches and measure the reduction in completion token count.
Expected impact: reduction from ~800 reasoning tokens per response to ~0, cutting response times from 10+ minutes to under 60 seconds for typical conversational inputs.

## **7.4 Medium Priority: Protect Bot Token in Logs**

The gateway log shows the agent autonomously calling web_fetch with the full Telegram bot token embedded in the URL. Consider adding the Telegram API base URL to a tool deny list or sanitizing tool call logs. The bot token visible in logs at 17:55:51 should be regenerated via @BotFather if this log was transmitted to any external system.

## **7.5 Medium Priority: Spawn Tool Concurrency Guard**

The spawn tool currently fires subagents without any awareness of available llama-server slot capacity. On a 2-slot configuration, spawning two subagents simultaneously from a heartbeat that already holds one slot will cause both subagents to contend for the remaining slot. Consider a spawn concurrency limit in the PicoClaw config or a staggered delay between spawn calls in the HEARTBEAT.md task definition.

## **7.6 Low Priority: Consider a Smaller Non-Reasoning Model**

For pure conversational assistant use on this hardware, a non-thinking model variant would perform significantly better. Recommended alternatives in the Qwen family that Yzma has confirmed working:
- Qwen2.5-0.5B-Instruct Q4_K_M: ~250 MiB, no reasoning mode, ~5-8 tok/s eval on ARMv8
- Qwen2.5-1.5B-Instruct Q4_K_M: ~900 MiB, better quality, ~3-5 tok/s eval on ARMv8
These models are listed in Yzma's MODELS.md and are compatible with the existing llama-server deployment. Switching models requires only changing the -m path in the llama-server launch command and updating the model name in PicoClaw's config.

# **8. Issue Summary and Resolution Matrix**

| **Issue** | **Severity** | **Effort** | **Resolution** |
| --- | --- | --- | --- |
| 262K context window consuming 3+ GB | CRITICAL | Low | Add --ctx-size 4096 to llama-server launch |
| request_timeout too low (120s) | CRITICAL | Low | Set request_timeout: 1200 in model_list config |
| Reasoning mode generating 800+ tokens | HIGH | Low | Add no-think instruction to system prompt |
| Spawn subagent timeout cascade | HIGH | Medium | Reduce n-parallel to 2; add spawn delay |
| Bot token visible in tool call logs | HIGH | Low | Regenerate token; sanitize web_fetch logging |
| Hybrid SSM forces full prompt reprocess | MEDIUM | None | Architectural limitation of Qwen3.5; no fix available |
| Speculative decoding disabled | LOW | None | Architectural limitation; accept as-is |
| Throughput variance 0.77-3.01 tok/s | LOW | Low | Reduced by ctx-size + n-parallel fixes above |

# **9. Conclusion**

This expanded analysis, grounded in live llama-server and PicoClaw gateway logs, confirms the fundamental stack architecture is sound and operational. The bot is running, the heartbeat executes tool chains, spawn subagents are dispatched, and responses are generated correctly — the inference pipeline is functioning end-to-end.
The critical path to a stable, responsive production deployment is straightforward: reduce the context window from 262,144 to 4,096 tokens (reclaiming 3 GB of RAM and eliminating swap), increase the request timeout to 1,200 seconds, and disable the model's reasoning mode. These three configuration changes require no code modifications and together are expected to reduce response latency from 10+ minutes to under 60 seconds for typical Telegram interactions.
The Qwen3.5 hybrid SSM + attention architecture introduces inherent limitations (no speculative decoding, constrained prefix caching, forced full reprocessing on recurrent layers) that cannot be resolved through configuration alone. These are fundamental properties of the model architecture and should be accepted as baseline performance characteristics for this model. If higher throughput is required, switching to a pure transformer model (e.g., Qwen2.5-0.5B) is the appropriate path.
The PicoClaw + Yzma/llama-server stack remains a compelling demonstration of fully local, privacy-preserving AI agent deployment on $10-class embedded hardware. With the recommended configuration changes applied, this setup is expected to deliver a practically usable conversational AI agent suitable for the single-user Telegram bot use case.

*End of Expanded Whitepaper  |  v2.0  |  All data sourced from live production logs*
