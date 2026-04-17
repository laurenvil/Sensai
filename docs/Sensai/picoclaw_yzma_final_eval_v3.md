**FINAL EVALUATION WHITEPAPER  —  v3.0**
**PicoClaw + Yzma/llama-server**
Full-Stack Production Evaluation on Arduino Uno Q (aarch64)

Hardware: Arduino Uno Q  |  aarch64 / ARMv8.0  |  4 GB RAM
*Model: Qwen_Qwen3.5-0.8B-Q6_K.gguf  (Hybrid SSM + Attention, Thinking Mode ON)*
Server: --ctx-size 12288 --parallel 2  |  PicoClaw: request_timeout 1200s
Date: March 15, 2026  |  Based on v1, v2 whitepaper findings + live production log analysis

# **1. Executive Summary**

This final whitepaper consolidates all findings from the v1 and v2 evaluation documents and incorporates live server, gateway, and LLM response data from the post-optimization deployment. It represents the definitive record of system behavior after all recommended configuration changes were applied.
Three configuration changes were implemented from the v2 recommendations: the context window was reduced from 262,144 to 12,288 tokens (--ctx-size 12288), parallel slots were reduced from 4 to 2 (--parallel 2), and the request timeout was increased to 1,200 seconds in PicoClaw's model_list config. These changes produced measurable improvements across all throughput metrics and eliminated the swap memory dependency.
However, the most significant new finding from this evaluation round is that /no_think did not suppress reasoning mode. The model received it as a literal user message, interpreted the text '/no_think' as part of the conversation, and still generated a full reasoning chain (364 completion tokens for a 'hi' prompt). This confirms that the /no_think directive must be delivered through the system prompt rather than the user message, and the correct mechanism for this deployment is editing the PicoClaw workspace SOUL.md or AGENTS.md file.
Additionally, the concurrent slot contention problem is now fully quantified: when a spawn subagent ran simultaneously with the main agent's 4,024-token prompt processing, the subagent's prompt throughput collapsed to 0.06 tokens/second — a 118x degradation versus solo operation. This is the primary remaining operational bottleneck.

# **2. Configuration Changes Applied and Verified**

## **2.1 llama-server: Context Window and Parallel Slots Reduced**

The server was restarted with the following command (confirmed from the server log):
/home/arduino/ArduinoApps/yzma/lib/llama-server \
-m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
--host 127.0.0.1 --port 8080 \
--ctx-size 12288 --parallel 2

The server log confirms the new context allocation:
llama_context: n_ctx         = 12288
llama_context: n_ctx_seq     = 6144
llama_context: n_seq_max     = 2

## **2.2 Memory Budget: Before vs After**

| **Buffer** | **Before (262K ctx, 4 slots)** | **After (12K ctx, 2 slots)** | **Saved** |
| --- | --- | --- | --- |
| Model weights (mmap) | 625.57 MiB | 625.57 MiB | 0 MiB |
| KV cache | 3,072.00 MiB | 144.00 MiB | 2,928 MiB |
| Recurrent state (SSM) | 77.06 MiB | 38.53 MiB | 38.5 MiB |
| Compute buffer | 786.02 MiB | 489.00 MiB | 297 MiB |
| Output buffer | 3.79 MiB | 1.89 MiB | 1.9 MiB |
| Token cache | 1.76 MiB | 1.76 MiB | 0 MiB |
| **TOTAL (llama-server)** | **~4,566 MiB** | **~1,301 MiB** | **≈ 3,265 MiB reclaimed** |

**✓  CONFIRMED: The device now operates entirely within 4 GB physical RAM. Swap dependency eliminated. Total llama-server footprint reduced by 71.5%.**

## **2.3 New kv_unified Behavior**

The new configuration shows kv_unified = false in the server log, changed from true in the original deployment. This is a consequence of the hybrid SSM architecture combined with the reduced parallel count. With kv_unified=false, each slot maintains a fully independent KV cache, which is the correct behavior for the hybrid model's memory access patterns and prevents cross-slot KV corruption in the recurrent layers.

# **3. Performance Results: Post-Optimization**

## **3.1 Throughput Comparison Table**

| **Metric** | **v1 Baseline** | **v3 Optimized** | **Delta** | **Conditions** |
| --- | --- | --- | --- | --- |
| Prompt tok/s (solo) | 4.12 | 7.09 | +72% | Task 0, first request |
| Prompt tok/s (checkpoint) | 6.29 | 6.15 | -2% | Similar; checkpoint reuse |
| Eval tok/s (solo) | 1.29 | 1.88 | +46% | Task 0 |
| Eval tok/s (checkpoint) | 2.97 | 1.87 | -37% | Different slot conditions |
| Prompt tok/s (concurrent) | ~1.81 | 0.06 | -97% | Task 2 blocked by Task 0 |
| Eval tok/s (concurrent) | ~1.29 | 0.76 | -41% | Task 2 blocked by Task 0 |
| ms per eval token (solo) | 774 ms | 532 ms | -31% | Task 0 |
| Total time for 378 tokens | ~293s est | 698s actual | worse (concurrent) | Task 2 contention |

Solo performance (one slot active) improved substantially — prompt processing at +72%, eval generation at +46%. This is the direct benefit of eliminating swap and reducing memory bandwidth contention. The improvements validate the memory reduction as the primary bottleneck in the v1 deployment.
**⚠  WARNING: Concurrent performance collapsed catastrophically. Task 2 (a 14-token spawn subagent prompt) ran simultaneously with Task 0's 4,024-token main agent prompt and achieved only 0.06 tok/s prompt throughput — a 118x degradation. Total time for Task 2 was 698,071 ms (11.6 minutes) for 378 tokens.**

## **3.2 The Concurrent Slot Starvation Problem Explained**

The server log makes the mechanism visible. Task 0 (main agent, 4,024 tokens) was mid-processing when Task 2 (spawn subagent, 14 tokens) arrived:
slot launch_slot_: id  1 | task  0  | processing task  (4024 tokens)
slot launch_slot_: id  0 | task  2  | processing task  (14 tokens)

Both slots share the same 4 CPU cores and memory bus. The large batch processing of Task 0 (2,048-token batches) fully saturates the compute pipeline. Task 2's tiny 14-token prompt is interleaved into the same batch scheduling and receives only residual compute time. The result is that Task 2's prompt phase took 216,606 ms for 14 tokens — essentially waiting for Task 0 to yield CPU time between batches.
This is not a bug — it is the expected behavior of llama-server's cooperative batch scheduler on a single-core-class device. The scheduler processes tokens from all active slots in the same batch pass, but when one slot dominates batch capacity, other slots effectively stall.
**ℹ  NOTE: This problem is inherent to running concurrent requests on a 4-core embedded device. It cannot be resolved by configuration alone. The architectural solution is to serialize spawn subagent execution rather than fire them concurrently.**

## **3.3 Heartbeat Cycle Performance**

The gateway log shows a full successful heartbeat cycle executing correctly under the new configuration:

| **Time** | **Iteration** | **Event** |
| --- | --- | --- |
| 22:12 | 1 | read_file(memory/2026/20260315.md) — FAILED: file not found (benign, new date path) |
| 22:14 | 2 | list_dir(memory/) — 0ms, 76 chars — agent self-recovers |
| 22:15 | 3 | read_file(HEARTBEAT_CHECK.md) — 0ms, 1,954 chars — SUCCESS |
| 22:18 | 4 | spawn({label:'Check unread messages', task:'Check for unread messages'}) — async fired |

The agent demonstrated intelligent self-recovery: when the date-stamped memory file was missing, it autonomously called list_dir to discover what files existed, then pivoted to read HEARTBEAT_CHECK.md. This is healthy agentic behavior requiring no intervention.
The spawn subagent was dispatched with a label field (new in this session vs the earlier evaluation), which is a PicoClaw feature for tracking async task identity in the message bus.

# **4. Critical Finding: /no_think Did Not Suppress Reasoning Mode**

## **4.1 The Failure**

The curl evaluation using /no_think hi as the user message content returned a response with reasoning_content still populated. The completion used 364 tokens, of which the vast majority were chain-of-thought reasoning. The model's reasoning content reveals what happened:
"reasoning_content": "Okay, the user just said 'no_think hi' in their message.
Let me break this down. First, 'no_think' is probably a typo or a specific
instruction... 'no_think' could be a request to not think or a command to stop."

The model received /no_think as literal text in the user turn and attempted to interpret its meaning as a conversational message. It did not recognize it as a control directive. Reasoning mode remained fully active.

## **4.2 Why /no_think Failed Here**

The /no_think directive is a Qwen3-family control token, but its effectiveness depends entirely on where it appears in the formatted prompt. The llama-server chat template for this model (confirmed in the startup log) structures the assistant turn as:
<|im_start|>assistant
<think>

The <think> block is always opened at the start of the assistant turn by the chat template before any user content is processed. For /no_think to suppress reasoning, it must appear in a position the template processes before opening the <think> block — either in the system prompt or as a special prefix recognized by the template's Jinja2 logic.
Placing /no_think in the user message content is processed after the template has already committed to opening the thinking block. It arrives as user text, not as a template control signal.

## **4.3 The Correct Implementation**

The fix must be applied at the system prompt level. In PicoClaw, edit the workspace SOUL.md or AGENTS.md file:
nano ~/.picoclaw/workspace/SOUL.md

Add the following as the first line of the file:
/no_think

And add to the body of the instructions:
Respond concisely and directly without internal reasoning.
Do not use <think> blocks or chain-of-thought reasoning.
Keep all responses under 100 words unless explicitly asked for detail.

Alternatively, pass the system prompt directly via the API for testing:
curl http://127.0.0.1:8080/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{"model":"Qwen_Qwen3.5-0.8B-Q6_K.gguf","messages":[
{"role":"system","content":"/no_think Respond briefly."},
{"role":"user","content":"hi"}
]}'

**⚠  WARNING: Until /no_think is correctly placed in the system prompt, all responses will continue generating full reasoning chains. With 364 completion tokens at 1.88 tok/s solo, response time remains approximately 194 seconds (3.2 minutes) per reply — still well above the previous 120s default timeout, but within the new 1,200s limit.**

## **4.4 Expected Impact Once Fixed**

Based on Qwen3 behavior with /no_think active, reasoning_content should become empty and completion_tokens should drop from ~300-864 to approximately 10-30 tokens for simple conversational responses. At 1.88 tok/s, a 20-token response would complete in approximately 10-15 seconds — an improvement of roughly 13-20x over the current observed latency.

# **5. Prompt Processing Deep Dive**

## **5.1 Why Task 0 Took 567 Seconds for Prompt Phase**

Task 0's prompt processing log shows 567,720 ms for 4,024 tokens at 7.09 tok/s. This appears contradictory: 4,024 / 7.09 = 567 seconds, which matches. But why does prompt processing take 9.46 minutes for a 4,024-token system prompt?
The answer lies in the hybrid SSM architecture. As established in the v2 whitepaper, the 18 SSM layers cannot use parallel prefix computation in the same way as pure attention layers. Each SSM layer must process tokens sequentially to maintain correct recurrent state. The 6 attention layers can use efficient batch processing, but the 18 SSM layers create a sequential bottleneck that limits prompt processing to the observed 7 tok/s ceiling on this hardware.
This is the system prompt being processed for the very first time. On subsequent turns (Tasks 102, 159, 226), checkpoint restoration reduces the effective prompt to only the new tokens since the last checkpoint, dramatically reducing processing time:

| **Task** | **New tokens processed** | **Prompt ms** | **Prompt tok/s** | **Eval tok/s** | **Checkpoint action** |
| --- | --- | --- | --- | --- | --- |
| 0 | 4,024 (full) | 567,720 | 7.09 | 1.88 | Created checkpoint 1 |
| 102 | 657 (delta) | 106,749 | 6.15 | 1.86 | Restored checkpoint 1 |
| 159 | 44 (delta) | 9,383 | 4.69 | 1.87 | Restored checkpoint 2 |
| 226 | 520 (delta) | 88,882 | 5.85 | 1.82 | Created checkpoint 4 |
| 382 | 695 (delta) | ~112,000 est | ~6.2 est | ~1.85 est | Restored checkpoint 4 |

The checkpoint system is working correctly. After the initial full prompt load, subsequent turns only process new tokens (the delta since the last checkpoint), reducing prompt processing from 9+ minutes to 1.5-3 minutes per turn. The first message in any new session will always be slow; subsequent messages in the same session are significantly faster.

## **5.2 The 4,024-Token System Prompt**

PicoClaw's default system prompt is confirmed at 4,024 tokens in every session. This is the concatenation of all workspace bootstrap files: SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, HEARTBEAT.md, USER.md, and any loaded skills (6 skills confirmed active). This is the irreducible baseline context for every request.
With n_ctx_seq = 6,144 tokens per slot and a 4,024-token system prompt baseline, each conversation has only 2,120 tokens of usable context for actual conversation content before the slot approaches its limit. When memory file reads are included (HEARTBEAT_CHECK.md at 1,954 chars in the heartbeat cycle), the usable space tightens further. The --ctx-size 12288 setting providing 6,144 per slot is the correct minimum for this deployment.
**ℹ  NOTE: Reducing the workspace file sizes (shorter SOUL.md, AGENTS.md etc.) is the only way to meaningfully increase the effective conversation context budget without increasing --ctx-size further.**

# **6. Date-Stamped Memory File: New Path Structure**

The gateway log reveals that PicoClaw is now looking for date-stamped memory files in a year-subdirectory path:
read_file({"path":"/home/arduino/.picoclaw/workspace/memory/2026/20260315.md"})

This differs from the path observed in the earlier evaluation (memory/20260315.md without the year subdirectory). This indicates either a PicoClaw version update changed the path convention, or a configuration option controls the structure. The agent handled the missing file correctly by falling back to list_dir, but proactively creating the directory and file will eliminate the error on every heartbeat cycle:
mkdir -p ~/.picoclaw/workspace/memory/2026
touch ~/.picoclaw/workspace/memory/2026/20260315.md

Going forward, a cron job or the agent itself can be instructed to create the daily file at midnight. The HEARTBEAT.md task list is the appropriate place to add this:
- Create today's memory file if it does not exist

# **7. Full System Status Matrix**

| **Item** | **v1 Status** | **v3 Status** | **Notes** |
| --- | --- | --- | --- |
| **RAM within 4 GB budget** | **✘ Exceeded** | **✓ 1.3 GB used** | **3.27 GB reclaimed** |
| **Swap dependency** | **✘ Active** | **✓ Eliminated** | **Major perf improvement** |
| **request_timeout** | **✘ 120s** | **✓ 1,200s** | **Sufficient for reasoning mode** |
| **KV cache size** | **3,072 MiB** | **144 MiB** | **21x reduction** |
| **Solo eval throughput** | **1.29 tok/s** | **1.88 tok/s** | **+46%** |
| **Solo prompt throughput** | **4.12 tok/s** | **7.09 tok/s** | **+72%** |
| **Context errors (400)** | **Yes** | **No** | **12,288 ctx sufficient** |
| **Heartbeat cycle** | **Partially failing** | **Working** | **list_dir self-recovery** |
| Date memory file path | N/A | Error (benign) | mkdir fix available |
| **/no_think in user message** | **N/A** | **✘ Not working** | **Must be in system prompt** |
| **Reasoning mode active** | **Yes** | **Yes (unchanged)** | **Awaiting system prompt fix** |
| **Concurrent slot starvation** | **Present** | **Present (quantified)** | **Architectural; serialize spawns** |
| **Bot token in tool logs** | **Present** | **Present** | **Regenerate via @BotFather** |

# **8. Remaining Action Items**

## **8.1 Immediate (unblock reasoning mode — highest ROI)**

- Edit ~/.picoclaw/workspace/SOUL.md and add /no_think as the first line, followed by instructions to respond concisely without chain-of-thought. Restart picoclaw gateway. Test with the curl benchmark — completion_tokens should drop from ~300-864 to under 30.
- Verify the fix worked by checking that reasoning_content is empty or absent in the next curl response.

## **8.2 Near-Term (operational stability)**

- Create the date-stamped memory directory: mkdir -p ~/.picoclaw/workspace/memory/2026 && touch ~/.picoclaw/workspace/memory/2026/20260315.md
- Regenerate the Telegram bot token via @BotFather. The current token appeared in plain text in the tool call log at 17:55:51 in the previous session.
- Add a HEARTBEAT.md task to create the daily memory file at the start of each heartbeat cycle to prevent the read_file error recurring tomorrow.

## **8.3 Medium-Term (performance)**

- Serialize spawn subagent execution. The current pattern of firing multiple spawn calls in the same heartbeat iteration causes catastrophic slot starvation (0.06 tok/s). Consider modifying HEARTBEAT.md to fire one spawn per heartbeat cycle, or add a sleep between spawn calls.
- Reduce workspace file sizes. The 4,024-token system prompt leaves only 2,120 tokens per slot for conversation. Trimming SOUL.md, AGENTS.md, and TOOLS.md could reclaim 500-1,000 tokens of usable context budget.
- Once /no_think is confirmed working, rerun the full curl benchmark suite from the v2 whitepaper to establish new baseline timings across all test cases.

## **8.4 Optional (further optimization)**

- Consider temperature: 0.3 alongside /no_think for shorter, more deterministic responses.
- Consider --no-warmup flag on llama-server to reduce startup time (currently running warmup by default).
- If response latency remains unsatisfactory after /no_think is fixed, evaluate Qwen2.5-0.5B-Instruct Q4_K_M as an alternative model with no reasoning mode and higher tok/s throughput.

# **9. Projected Performance After All Fixes Applied**

Based on measured data and known model behavior, the following performance profile is expected once /no_think is correctly active in the system prompt:

| **Scenario** | **Current (reasoning ON)** | **Projected (reasoning OFF)** | **Basis** |
| --- | --- | --- | --- |
| 'hi' response time | ~194s (364 tokens ÷ 1.88) | ~8-12s (15-20 tokens ÷ 1.88) | Qwen3 no_think token count |
| Heartbeat cycle (tool loop) | ~20-30 min total | ~3-5 min total | 5 iterations × ~45s each |
| Within 120s default timeout | No (needs 1200s) | Yes for most replies | Short answers < 60 tokens |
| Concurrent spawn impact | Severe (698s for 14-token prompt) | Moderate (same starvation) | Starvation is architectural |
| Memory usage | ~1.3 GB (stable) | ~1.3 GB (stable) | No change expected |

# **10. Conclusion**

This final evaluation confirms that the PicoClaw + Yzma/llama-server stack on the Arduino Uno Q is a functioning, production-capable edge AI deployment. All three critical configuration changes from the v2 whitepaper have been successfully applied and verified through log analysis. The device is no longer under memory pressure, throughput has improved by 46-72% in solo operation, and the agent's heartbeat and tool loop cycles are executing correctly.
The single remaining blocker to a fully responsive deployment is reasoning mode. The /no_think directive was misapplied to the user message rather than the system prompt, leaving chain-of-thought generation active. This is a one-line fix to SOUL.md and represents the highest-leverage remaining action. Once applied, response latency for conversational exchanges is projected to drop from ~3 minutes to under 15 seconds.
The concurrent slot starvation problem (spawn subagents blocking on the main agent's large prompt) is a fundamental architectural constraint of single-device deployment with a 4,024-token system prompt. It cannot be resolved through configuration; it requires either serializing spawn execution or accepting that spawned subagents will be slow when the main agent is actively processing. For the current use case (30-minute heartbeat intervals, single Telegram user), this constraint is operationally acceptable.
The Arduino Uno Q running PicoClaw + Yzma/llama-server with Qwen3.5-0.8B-Q6_K is a fully validated, entirely local, privacy-preserving AI agent platform. All inference, memory, and tool execution occurs on-device with no cloud dependency. With the /no_think fix applied, this configuration is recommended for production Telegram bot deployment.

*End of Final Evaluation Whitepaper  |  v3.0  |  PicoClaw + Yzma/llama-server  |  Arduino Uno Q  |  March 15, 2026*
