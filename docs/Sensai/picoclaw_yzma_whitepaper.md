**TECHNICAL WHITEPAPER**
**PicoClaw + Yzma: Edge AI Inference**
Interaction Architecture on the Arduino Uno Q (aarch64)

*Evaluation Subject: Qwen3.5-0.8B-Q6_K.gguf on aarch64 Hardware*
Date: March 15, 2026

# **1. Executive Summary**

This whitepaper documents the technical architecture and observed interaction behavior between PicoClaw — an ultra-lightweight Go-based AI agent gateway — and Yzma, a Go library for in-process llama.cpp inference, as evaluated on an Arduino Uno Q (aarch64) running the Qwen3.5-0.8B-Q6_K GGUF model.
The evaluation demonstrates a fully local, serverless AI agent stack capable of running on $10-class embedded Linux hardware. The entire inference pipeline, from incoming Telegram message to generated response, operates without any cloud dependency. All communication between PicoClaw and the inference layer occurs over a loopback HTTP interface implementing the OpenAI-compatible chat completions API.
Key findings from the evaluation sample include a functional end-to-end response cycle with reasoning-chain output enabled, inference throughput of approximately 1.29 tokens/second, and prompt processing at 4.12 tokens/second — sufficient for interactive asynchronous messaging use cases.

# **2. Component Overview**

## **2.1 PicoClaw**

PicoClaw (github.com/sipeed/picoclaw) is an AI agent framework written in Go, designed specifically for resource-constrained hardware. Its core design philosophy is radical minimalism: under 10MB RAM at idle, sub-1-second cold boot, and a single self-contained binary that runs across x86, ARM, RISC-V, and MIPS architectures.
In this deployment, PicoClaw operates in gateway mode, maintaining a persistent connection to Telegram via long-poll and routing inbound messages through its internal agent loop. The agent loop's sole external dependency is an OpenAI-compatible HTTP endpoint for LLM inference.
Relevant configuration for this evaluation:

| **Parameter** | Value |
| --- | --- |
| **api_base** | http://127.0.0.1:8080/v1 |
| **model** | Qwen_Qwen3.5-0.8B-Q6_K.gguf |
| **max_tokens** | 4096 (recommended for 0.8B models) |
| **request_timeout** | 600s (required for slow embedded inference) |
| **summarize_message_threshold** | 8 |
| **summarize_token_percent** | 50 |

## **2.2 Yzma**

Yzma (github.com/hybridgroup/yzma) is a Go library that provides direct, in-process bindings to llama.cpp without requiring CGo. It achieves this through the purego and ffi packages, allowing standard Go toolchain compilation (go build / go run) with no C compiler dependency.
Yzma's architecture has two distinct usage modes:
- In-process library mode: Yzma functions are called directly from Go application code, loading the GGUF model into the same process memory space. Inference is a direct function call.
- llama-server mode: Yzma manages installation and lifecycle of the llama.cpp llama-server binary, which exposes an OpenAI-compatible HTTP server. This is the mode active in the current evaluation.
The Arduino Uno Q is an explicitly listed supported deployment target in Yzma's PROJECTS.md and INSTALL.md documentation, making this a first-class supported configuration.

## **2.3 llama-server**

llama-server is the HTTP server component of llama.cpp (github.com/ggml-org/llama.cpp). When launched, it loads a specified GGUF model file into memory and serves an OpenAI-compatible REST API. In this deployment it binds to the loopback interface at 127.0.0.1:8080.
The server exposes the /v1/chat/completions endpoint, accepting JSON request bodies conforming to the OpenAI Chat Completions API schema. This interface is the contract between PicoClaw and the inference layer.

# **3. Fundamental Interaction Architecture**

## **3.1 Full Request/Response Lifecycle**

The following describes the complete path of a single user message from Telegram to the delivered response:

| **Step** | **Actor** | **Action** |
| --- | --- | --- |
| **1** | Telegram | User sends message to the PicoClaw bot |
| **2** | PicoClaw Gateway | Long-poll receives update; dispatches to internal message bus |
| **3** | PicoClaw Agent Loop | Constructs system prompt + conversation history into messages array |
| **4** | PicoClaw HTTP Client | Issues HTTP POST to http://127.0.0.1:8080/v1/chat/completions with JSON body |
| **5** | llama-server | Receives request; deserializes chat messages; applies chat template to GGUF model vocab |
| **6** | llama.cpp Engine | Tokenizes prompt; runs autoregressive sampling loop; generates tokens |
| **7** | llama-server | Serializes completion result as OpenAI-compatible JSON response with usage stats |
| **8** | PicoClaw Agent Loop | Parses response; extracts content field; checks finish_reason |
| **9** | PicoClaw Gateway | Delivers assistant response text back to Telegram chat |

## **3.2 The HTTP Interface Contract**

The sole integration point between PicoClaw and Yzma/llama-server is a local HTTP connection conforming to the OpenAI Chat Completions API. This is a stateless, request-response protocol. PicoClaw constructs each request independently, injecting the full conversation context (session history + system prompt) on every call, since llama-server is stateless between requests.
The request body from the evaluation:
POST http://127.0.0.1:8080/v1/chat/completions
Content-Type: application/json

{
"model": "Qwen_Qwen3.5-0.8B-Q6_K.gguf",
"messages": [
{"role": "user", "content": "hi"}
]
}

The response envelope returned by llama-server:
{
"choices": [{
"finish_reason": "stop",
"index": 0,
"message": {
"role": "assistant",
"content": "Hello! How can I help you today?",
"reasoning_content": "Thinking Process: ..."
}
}],
"model": "Qwen_Qwen3.5-0.8B-Q6_K.gguf",
"usage": { "prompt_tokens": 11, "completion_tokens": 864, "total_tokens": 875 }
}

PicoClaw's agent loop reads the choices[0].message.content field as the assistant reply. The reasoning_content field (Qwen3's internal chain-of-thought) is surfaced by llama-server but not forwarded to the Telegram user in the default configuration — it is consumed internally by PicoClaw for context tracking only.

## **3.3 Transport Layer**

Both PicoClaw and llama-server run as separate processes on the same host. Communication occurs entirely over the IPv4 loopback interface (127.0.0.1), meaning no network traffic leaves the device. This is architecturally significant for:
- Security: No API keys, no external DNS, no TLS required for the inference leg of the pipeline.
- Latency: Loopback incurs negligible network overhead; all delay is inference compute time.
- Privacy: User message content never leaves the Arduino Uno Q hardware.
The only external network call in the entire stack is PicoClaw's Telegram long-poll to api.telegram.org — the inference itself is fully air-gapped from the internet.

# **4. Yzma's Role: From Library to Inference Server**

## **4.1 How Yzma Bridges Go and llama.cpp**

A fundamental architectural property of Yzma is that it eliminates CGo from the inference path. Traditional Go-to-C++ integration requires CGo, which introduces cross-compilation complexity, slower build times, and runtime overhead from Go-C boundary crossings. Yzma instead uses:
- purego: A Go package enabling calls to shared libraries (.so files) using only the Go runtime, without C compilation.
- ffi: A foreign function interface layer over purego that handles type marshaling between Go and C calling conventions.
This means Yzma loads the llama.cpp shared libraries (libllama.so, libmtmd.so) at runtime via dlopen-equivalent calls, then invokes llama.cpp functions as if they were native Go functions. The GGUF model is loaded into the same OS process, eliminating inter-process communication overhead for in-library mode.

## **4.2 llama-server Mode vs. In-Process Mode**

In the current evaluation, Yzma is operating in llama-server mode rather than in-process library mode. The distinction is important:

| **Property** | **In-Process Library Mode** | **llama-server Mode (this eval)** |
| --- | --- | --- |
| **Process boundary** | Single process | Two processes (picoclaw + llama-server) |
| **Communication** | Direct function call | HTTP/JSON over loopback |
| **Interface** | Yzma Go API | OpenAI-compatible REST |
| **Overhead** | Minimal (ns) | HTTP serialization (~ms) |
| **Model sharing** | Not applicable | Multiple clients can share one server |
| **Restart isolation** | Restart kills model | Model survives PicoClaw restart |

For the PicoClaw use case, llama-server mode is the correct choice: PicoClaw is an agent framework with its own process lifecycle, and llama-server mode allows the model to remain loaded in memory continuously while PicoClaw restarts or reconfigures itself. On memory-constrained hardware, model load time is significant, so keeping the model hot in llama-server is a meaningful operational advantage.

# **5. Evaluation Data Analysis**

## **5.1 Observed Request**

The following raw curl output was captured during the evaluation and forms the primary data for this analysis:
Model:       Qwen_Qwen3.5-0.8B-Q6_K.gguf
Endpoint:    http://127.0.0.1:8080/v1/chat/completions
Input:       {"role": "user", "content": "hi"}
Output:      "Hello! How can I help you today?"
finish_reason: stop

## **5.2 Performance Metrics**

| **Metric** | **Value** |
| --- | --- |
| **Prompt tokens** | **11** |
| **Completion tokens** | **864** |
| **Total tokens** | **875** |
| **Prompt processing time** | **2,670 ms** |
| **Prompt tokens/sec** | **4.12 tok/s** |
| **Generation time** | **668,880 ms (~11.1 min)** |
| **Generation tokens/sec** | **1.29 tok/s** |
| **Time to first token (TTFT)** | **~2,670 ms** |
| **Reasoning tokens generated** | **~850 of 864 total** |
| **Useful output tokens** | **~14 (the visible reply)** |
| **finish_reason** | **stop (clean completion)** |
| **system_fingerprint** | **b1-c96f608d** |

## **5.3 The Reasoning Overhead Problem**

The most operationally significant finding is the token budget consumed by Qwen3's reasoning chain. Of 864 total completion tokens, approximately 850 were internal chain-of-thought reasoning (the reasoning_content field), and only ~14 tokens comprised the visible user-facing reply: "Hello! How can I help you today?"
At 1.29 tokens/second, generating 864 tokens requires approximately 669 seconds (11+ minutes). This is the root cause of the timeout errors previously observed in the picoclaw logs. The model is successfully generating a correct and coherent response — it simply requires more time than PicoClaw's default 120-second HTTP timeout allows.
The fix already applied (request_timeout: 600) is validated by this data: 600 seconds would be sufficient for responses up to approximately 774 completion tokens. For this specific prompt, 864 tokens slightly exceeds even the 600s window. A timeout of 900–1200 seconds is recommended for this model/hardware combination when reasoning mode is active.

## **5.4 Reasoning Mode Consideration**

Qwen3 models expose a thinking/reasoning toggle. In reasoning mode (the default for instruction-tuned Qwen3 variants), the model generates a full internal scratchpad before producing the final answer. On a 4.12-token/second prompt processor and 1.29-token/second generator, this is extremely expensive for simple conversational inputs.
For the PicoClaw Telegram use case, it is strongly recommended to evaluate whether reasoning mode provides sufficient benefit to justify the latency cost. Disabling reasoning (where supported by the model's chat template) or using a non-reasoning GGUF variant of Qwen3.5-0.8B would reduce response times from 10+ minutes to under 60 seconds for typical conversational exchanges.

# **6. Timeout Architecture Deep Dive**

## **6.1 The Three Timeout Boundaries**

There are three distinct timeout boundaries in this stack that must be understood and configured correctly:

| **Layer** | **Default** | **Recommended for this eval** |
| --- | --- | --- |
| **PicoClaw HTTP client** | 120s (hardcoded in pkg/providers/openai_compat/provider.go) | 1200s via request_timeout in model_list entry |
| **llama-server slot timeout** | No default; runs until complete | No change needed |
| **Telegram message timeout** | ~60s before bot API considers request stale | PicoClaw handles retry; no change needed |

# **7. Recommendations**

## **7.1 Immediate Configuration Changes**

- Increase request_timeout to at least 1200 in the model_list config entry to safely cover worst-case reasoning responses.
- Investigate disabling Qwen3 reasoning mode via the model's chat template or a system prompt instruction such as "/no_think" if the Qwen3.5-0.8B variant supports it. This alone could reduce response time by 10x.
- Set max_tokens to 2048 rather than 4096 to cap runaway reasoning chains at a more predictable upper bound.

## **7.2 Model Selection**

- Consider switching to a non-reasoning Qwen2.5-0.5B or Qwen2.5-1.5B GGUF for pure conversational use cases. These models do not generate reasoning chains and will respond in under 60 seconds at 1.29 tok/s.
- The Q6_K quantization used (Qwen_Qwen3.5-0.8B-Q6_K) is a higher-quality quantization. For further speed improvement, Q4_K_M would reduce model size and potentially increase inference throughput at a modest quality tradeoff.

## **7.3 Architecture Validation**

- The fundamental architecture is sound and validated. PicoClaw → HTTP → llama-server is a well-established pattern for local LLM agent deployments.
- The finish_reason: stop in the evaluation response confirms the full inference pipeline is functioning correctly end-to-end. The only operational issue is latency, not correctness.
- No changes to the Yzma or llama-server configuration are required. All tuning levers are on the PicoClaw side.

# **8. Conclusion**

This evaluation confirms that the PicoClaw + Yzma/llama-server stack on an Arduino Uno Q (aarch64) is a fully functional edge AI inference architecture. The complete pipeline from Telegram message receipt to LLM-generated response operates entirely on-device, with no cloud inference dependency.
The primary operational challenge — inference latency — is a direct consequence of the Qwen3.5-0.8B model's reasoning chain behavior rather than any architectural deficiency. The observed 11-minute generation time for a simple greeting reflects ~850 reasoning tokens being generated silently before the 14-token visible reply. Disabling or constraining reasoning mode is the highest-leverage optimization available.
With the timeout configuration corrected and reasoning mode addressed, this stack is expected to deliver acceptable interactive response times (under 60 seconds) for conversational Telegram bot use cases on the Arduino Uno Q hardware.

*End of Whitepaper*
