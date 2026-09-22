# LLM facts: local model calls and Prompt token counting

Research note for [#4](https://github.com/NikosZisisPD/collaboard/issues/4) on the [Say Less map](https://github.com/NikosZisisPD/collaboard/issues/2). Researched on 2026-09-23 from primary sources: official docs, source code, model cards, package registries, and specs. Every claim links to the source that owns it.

**Versions these facts apply to:** Ollama v0.34.3 ([released 2026-09-19](https://github.com/ollama/ollama/releases/tag/v0.34.3)), which pins llama.cpp [b10969](https://github.com/ollama/ollama/blob/v0.34.3/LLAMA_CPP_VERSION); ollama-js 0.6.3; gpt-tokenizer 4.0.0; js-tiktoken 1.0.21; tiktoken 1.0.22; @huggingface/tokenizers 0.2.0; Godot 4.7.2 ([latest stable](https://github.com/godotengine/godot/releases/tag/4.7.2-stable)).

**Machine:** MacBook Pro (Mac16,7) with an Apple M4 Pro (14-core CPU, 20-core GPU), 24 GB unified memory, macOS 26.6.2, read with `system_profiler`. Ollama is not installed, and no software, packages, or models were installed or downloaded for this note.

## Summary

**Recommended model: `qwen3.5:4b`**, the default GGUF tag (Q4_K_M, 3.4 GB). It's a small current-generation model with strong vendor-reported instruction-following and tool-use scores for its size. It's Apache-2.0 licensed, fits this Mac's GPU memory with well over 10 GiB to spare, and answers directly once thinking is off. Call it with `think: false`, a JSON-schema `format`, and `keep_alive: -1`. The runner-ups for [#6](https://github.com/NikosZisisPD/collaboard/issues/6) to try against it are `ministral-3:3b` (no thinking mode to manage) and `qwen3.5:9b` (stronger, twice the size).

**Recommended tokenizer: [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer) 4.0.0 with the `cl100k_base` encoding.** It's pure TypeScript, MIT licensed, and has zero dependencies. `countTokens()` runs synchronously in microseconds by the library's own benchmark, so it can run on every keystroke. The encoding data is 1.16 MB (445 KB gzipped). It doesn't match the Companion's tokenizer, and it doesn't need to ([ADR-0002](https://github.com/NikosZisisPD/collaboard/blob/main/docs/adr/0002-prompt-budget-counts-only-player-text.md)).

Five facts that shape [#6](https://github.com/NikosZisisPD/collaboard/issues/6) and [#7](https://github.com/NikosZisisPD/collaboard/issues/7):

1. **Turn thinking off.** Thinking is on by default for models that support it. When a JSON `format` is set, Ollama lets the model think unconstrained, then cancels and restarts it under the grammar, which costs a second pass over the prompt. `think: false` avoids both.
2. **`format` is enforced, not requested.** Both of Ollama's engines constrain sampling with a grammar compiled from the JSON schema, so the Companion's reply always parses. The model never sees the schema, so the hidden instructions must describe it too.
3. **No CORS setup is needed.** Ollama's built-in allow-list covers `http://localhost:*` and `http://127.0.0.1:*`, so a game served from any localhost port can call it.
4. **This Mac defaults to a 4,096-token context.** Ollama sizes the default from GPU memory, and Metal exposes 17.76 GiB of the 24 GiB here, which is under Ollama's 24 GiB tier.
5. **Godot can't stream Ollama replies with its own HTTP classes**, because web exports don't support chunked responses. Godot also has no tokenizer library. A Godot build would reach the JavaScript tokenizer (and `fetch`) through `JavaScriptBridge`.

No primary source publishes reply times for these models on an M4 Pro. The only figure for this chip is llama.cpp's reference benchmark: Llama 2 7B at 4-bit processes about 440 prompt tokens/s and generates about 51 tokens/s. Measuring the real numbers belongs to [#6](https://github.com/NikosZisisPD/collaboard/issues/6).

---

## 1. Which models fit this Mac, and how fast they reply

### How much memory a model can use

- Ollama finds GPUs by starting llama.cpp's `llama-server` ([discover/runner.go](https://github.com/ollama/ollama/blob/v0.34.3/discover/runner.go#L488-L511)). llama.cpp's Metal backend reports `recommendedMaxWorkingSetSize` as the device's total memory ([ggml-metal-device.m](https://github.com/ggml-org/llama.cpp/blob/b10969/ggml/src/ggml-metal/ggml-metal-device.m#L1485-L1494)). On Apple Silicon, Ollama never refreshes free GPU memory ([discover/runner.go](https://github.com/ollama/ollama/blob/v0.34.3/discover/runner.go#L267-L268)).
- Apple defines that value as "an approximation of how much memory, in bytes, this GPU device can allocate without affecting its runtime performance" ([Apple docs](https://developer.apple.com/documentation/metal/mtldevice/recommendedmaxworkingsetsize)).
- **On this Mac it is 19,069,665,280 bytes, or 17.76 GiB of 24 GiB.** I measured this with a read-only one-line Swift call to `MTLCreateSystemDefaultDevice().recommendedMaxWorkingSetSize`.
- Ollama picks its default context from total GPU memory: 262,144 tokens at 47 GiB or more, 32,768 at 23 GiB or more, and 4,096 otherwise ([server/routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2066-L2081)). The docs describe the same tiers ([context-length.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/context-length.mdx)). **This Mac therefore defaults to 4,096 tokens.** A request can override it with `options.num_ctx`, and the server with `OLLAMA_CONTEXT_LENGTH` ([FAQ](https://docs.ollama.com/faq)). Ollama logs the chosen value as `vram-based default context` ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2081)).
- `ollama ps` shows how much of a loaded model sits on the GPU and its context size ([FAQ](https://docs.ollama.com/faq), [context-length.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/context-length.mdx)). To run 100% on the GPU, the model plus its context cache must stay under 17.76 GiB, and macOS, the browser, and the game need memory too.

### Candidates

Download sizes and capability tags come from each model's tags page on ollama.com. Model facts come from the vendors' model cards.

| Model tag (default quantization) | Download | Size | Capabilities in Ollama | Licence | Notes |
| --- | --- | --- | --- | --- | --- |
| `qwen3.5:4b` (Q4_K_M) | 3.4 GB ([tags](https://ollama.com/library/qwen3.5/tags)) | 4B, with a vision encoder ([card](https://huggingface.co/Qwen/Qwen3.5-4B)) | vision, tools, thinking | Apache-2.0 | Thinks by default. 24 of its 32 layers are Gated DeltaNet (recurrent) ([card](https://huggingface.co/Qwen/Qwen3.5-4B)). An MLX build, `qwen3.5:4b-mlx`, is 4.0 GB. |
| `qwen3.5:9b` (Q4_K_M) | 6.6 GB ([tags](https://ollama.com/library/qwen3.5/tags)) | 9B | vision, tools, thinking | Apache-2.0 | Stronger scores (see §2), about twice the bytes per token. |
| `qwen3.5:2b` (Q8_0) | 2.7 GB, or 1.9 GB as `2b-q4_K_M` ([tags](https://ollama.com/library/qwen3.5/tags)) | 2B | vision, tools, thinking | Apache-2.0 | The smallest option in the family worth trying. |
| `ministral-3:3b` (Q4_K_M) | 3.0 GB ([tags](https://ollama.com/library/ministral-3/tags)) | 3B | vision, tools | Apache-2.0 ([card](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512)) | An instruct model with no thinking mode. Mistral recommends a temperature below 0.1 ([card](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512)). |
| `ministral-3:8b` (Q4_K_M) | 6.0 GB ([tags](https://ollama.com/library/ministral-3/tags)) | 8B | vision, tools | Apache-2.0 | |
| `gemma4:e4b` (Q4_K_M) | 9.6 GB, or 6.1 GB as `e4b-it-qat` ([tags](https://ollama.com/library/gemma4/tags)) | 4.5B effective, 8B with embeddings ([card](https://huggingface.co/google/gemma-4-E4B-it)) | vision, tools, thinking, audio | Apache-2.0 | A large download for its class. The card attributes the gap between effective and total parameters to large per-layer embedding tables. |
| `gemma4:12b` (Q4_K_M) | 7.6 GB ([tags](https://ollama.com/library/gemma4/tags)) | 11.95B ([card](https://huggingface.co/google/gemma-4-E4B-it)) | vision, tools, thinking | Apache-2.0 | |
| `lfm2.5:8b` | 5.2 GB ([library](https://ollama.com/library/lfm2.5)) | 8.3B total, 1.5B active (mixture of experts) ([card](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B)) | tools, thinking | custom `lfm1.0` licence ([card](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B)) | Few active parameters should mean fast generation, but it's "a reasoning model": its replies contain "an explicit chain of thought before the final answer" ([card](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B)). |
| `llama3.2:3b` | 2.0 GB ([tags](https://ollama.com/library/llama3.2/tags)) | 3B | tools | not reviewed | 2024 generation. `ollama launch` now warns before using Llama 3.x models ([v0.32.0 notes](https://github.com/ollama/ollama/releases/tag/v0.32.0)). |

These fit poorly or not at all: `gpt-oss:20b` (14 GB, [tags](https://ollama.com/library/gpt-oss/tags)) nearly fills the 17.76 GiB, and its thinking "cannot be fully disabled" ([thinking.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/thinking.mdx?plain=1#L12)). `qwen3.5:27b` (17 GB), `gemma4:26b` (19 GB, or 16 GB as `26b-nvfp4`), and `qwen3.5:35b` (24 GB) are too big ([qwen3.5 tags](https://ollama.com/library/qwen3.5/tags), [gemma4 tags](https://ollama.com/library/gemma4/tags)).

**Two engines.** On Apple Silicon, tags marked MLX (`-mlx`, `-nvfp4`, `-mxfp8`) run on Ollama's MLX engine. GGUF tags (`q4_K_M`, `q8_0`, and the defaults above) run on llama.cpp, which since v0.30 "augments Ollama's MLX engine on Apple silicon" ([blog, 2026-06-05](https://ollama.com/blog/improved-performance-and-model-support-with-gguf), [blog, 2026-06-11](https://ollama.com/blog/mlx-performance)). Ollama now runs llama.cpp's `llama-server` as a subprocess ([llm/llama_server.go](https://github.com/ollama/ollama/blob/v0.34.3/llm/llama_server.go#L1-L10)).

### How fast they reply

**No primary source publishes time-to-first-token or tokens/s for these candidates on an M4 Pro.** The closest figures:

- **llama.cpp's reference benchmark** has a row for this exact chip configuration: M4 Pro, 20 GPU cores, 273 GB/s memory bandwidth, running Llama 2 7B at llama.cpp commit 8e672ef ([discussion #4167](https://github.com/ggml-org/llama.cpp/discussions/4167), maintained by llama.cpp's author). Prompt processing is measured at batch size 512, generation at batch size 1:

  | Llama 2 7B weights | Prompt processing (tokens/s) | Generation (tokens/s) |
  | --- | --- | --- |
  | F16 | 464.48 | 17.18 |
  | Q8_0 | 449.62 | 30.69 |
  | Q4_0 | 439.78 | 50.74 |

- **Ollama's own figures** are for other hardware. Its MLX engine's NVFP4 builds generate "about 20% faster than q4_K_M" ([blog, 2026-06-11](https://ollama.com/blog/mlx-performance); the chart doesn't state its hardware, and the post's demo runs on an M5 Max). A metadata cache cut time-to-first-token "from ~995 ms to ~524 ms in benchmarks" ([v0.32.15 notes](https://github.com/ollama/ollama/releases/tag/v0.32.15); hardware not stated).

**How #6 can measure.** Every response ends with `load_duration`, `prompt_eval_count`, `prompt_eval_cached_count`, `prompt_eval_duration`, `eval_count`, and `eval_duration`, all in nanoseconds. For streaming responses they arrive in the final chunk ([api/usage.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/api/usage.mdx)). Tokens/s is `eval_count / eval_duration`.

**What drives the first reply's delay** (from the fields above):

- **Model load**, on the first call only. Avoid it by preloading and keeping the model loaded (§3).
- **Processing the uncached part of the prompt.** Ollama reuses cached prompt prefixes and reports how many prompt tokens came from the cache ([api/usage.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/api/usage.mdx), [blog, 2026-06-11](https://ollama.com/blog/mlx-performance)). So the hidden instructions should be an unchanging prefix, with the Level and the Prompt after them. Recurrent layers like Qwen 3.5's "carry state that can't be rewound", so Ollama saves snapshots at likely return points ([same post](https://ollama.com/blog/mlx-performance)). #6 should confirm cache hits with `prompt_eval_cached_count`.
- **A second prompt pass** if thinking is on while `format` is set (§2).

**My estimate, not a measurement:** generation speed on Apple Silicon tracks memory bandwidth, which is what the benchmark thread plots. A 3–4B model at 4-bit reads fewer bytes per token than the 7B Q4_0 reference, so it should generate at least about 50 tokens/s here. A Companion reply of about 50 tokens of action JSON would then take roughly a second. At the reference rate of about 440 tokens/s, 1,000 uncached tokens of hidden instructions would take about 2 s on a 7B model, less on a 4B one, and nothing once cached. #6 should replace these guesses with measurements.

## 2. Replies in a fixed action format

### Structured outputs (`format`)

- `format` accepts `"json"` or a JSON schema, on both `/api/generate` and `/api/chat` ([api.md](https://github.com/ollama/ollama/blob/v0.34.3/docs/api.md?plain=1#L52), [structured-outputs.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/structured-outputs.mdx)). The feature shipped in December 2024 ([blog](https://ollama.com/blog/structured-outputs)).
- Ollama's own tips are to also put the schema in the prompt, and to lower the temperature (for example to 0) for more deterministic replies ([structured-outputs.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/structured-outputs.mdx)). Ollama's cloud models don't support structured outputs (same page), which is one more reason to avoid `:cloud` tags.
- **It's enforced by a grammar on both engines:**
  - GGUF models: Ollama passes the schema to `llama-server` ([llama_server.go](https://github.com/ollama/ollama/blob/v0.34.3/llm/llama_server.go#L1598-L1611), [chat path](https://github.com/ollama/ollama/blob/v0.34.3/llm/llama_server.go#L2200-L2204)). llama.cpp converts JSON Schema to a GBNF grammar that constrains sampling ([grammars README](https://github.com/ggml-org/llama.cpp/blob/b10969/grammars/README.md?plain=1#L141-L151)).
  - MLX models: Ollama uses xgrammar bound to the model's vocabulary ([mlxrunner/grammar.go](https://github.com/ollama/ollama/blob/v0.34.3/mlxrunner/grammar.go#L52-L78)). This arrived only in [v0.33.1](https://github.com/ollama/ollama/releases/tag/v0.33.1) (2026-08-26) and got faster in [v0.34.0](https://github.com/ollama/ollama/releases/tag/v0.34.0).
  - So a reply matches the schema whatever the model. The model only has to pick sensible values.
  - One exception: a reply that hits a token limit (`num_predict` or the context) stops mid-JSON. Bound the length with `maxItems` in the schema rather than a tight `num_predict`.
- **Schema rules on the llama.cpp path** ([grammars README](https://github.com/ggml-org/llama.cpp/blob/b10969/grammars/README.md?plain=1#L151-L216)):
  - "The model has no visibility into the schema", so describe it in the prompt.
  - `additionalProperties` defaults to `false`.
  - `minItems` and `maxItems` work, and `minimum`/`maximum` work only on integers.
  - A type can't mix `properties` with `anyOf`/`oneOf`. Nested `$ref`s and `prefixItems` are broken.
  - "Unsupported features are skipped silently".
  - Grammars also "have performance gotchas" ([README](https://github.com/ggml-org/llama.cpp/blob/b10969/grammars/README.md?plain=1#L125)).

  A flat schema suits the Companion: an `actions` array with `maxItems`, whose items have an `enum` of verbs and bounded integers.

### Thinking and `format`

- "Thinking is enabled by default in the CLI and API for supported models" ([thinking.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/thinking.mdx?plain=1#L153)). `think` takes a boolean or a level ([api.md](https://github.com/ollama/ollama/blob/v0.34.3/docs/api.md?plain=1#L48)). v0.34.3 added the ability to see each model's thinking controls and default with `ollama show` or `/api/show` ([v0.34.3 notes](https://github.com/ollama/ollama/releases/tag/v0.34.3)).
- With a thinking model, `format` set, and thinking on, Ollama runs a "double request". It generates unconstrained until the thinking ends, cancels, rebuilds the prompt with the thinking included, and restarts with the grammar ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2804-L2815), [restart](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2979)). With `think: false` on a model that has a built-in parser, the grammar applies from the first token ([`forceImmediate`](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2813)).
- With thinking off, Ollama's Qwen 3.5 renderer is set to emit an empty think block (`emitEmptyThinkOnNoThink`), so the model answers directly ([qwen35.go](https://github.com/ollama/ollama/blob/v0.34.3/model/renderers/qwen35.go#L54-L67)). Its Gemma 4 renderer adds the `<|think|>` trigger only when thinking is on ([gemma4.go](https://github.com/ollama/ollama/blob/v0.34.3/model/renderers/gemma4.go#L48-L52)). For models driven by llama.cpp's own chat templates, `think` becomes `enable_thinking` ([llama_server.go](https://github.com/ollama/ollama/blob/v0.34.3/llm/llama_server.go#L2209-L2223)).

### Tool calling

- `/api/chat` takes `tools` as function definitions with JSON-schema parameters. The model replies with `tool_calls`, the app runs them and sends back `role: "tool"` results, and the model continues. Streaming works with tool calls ([tool-calling.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/tool-calling.mdx), [blog, 2025-05-28](https://ollama.com/blog/streaming-tool)). Models that support it carry the `tools` tag ([search](https://ollama.com/search?c=tools)) and list it in `ollama show` ([blog, 2026-06-05](https://ollama.com/blog/improved-performance-and-model-support-with-gguf)).
- Ollama pulls tool calls out of the model's text with a model-specific parser, or with a template-based parser when the model has none ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2781-L2784)). For tool calling, llama.cpp injects the schemas into the prompt ([grammars README](https://github.com/ggml-org/llama.cpp/blob/b10969/grammars/README.md?plain=1#L151)). I found no documentation promising schema-valid tool arguments the way `format` promises a schema-valid reply.
- **Fit for the Companion:** `format` gets a whole action list in one round trip. Tool calling suits a step-by-step loop that feeds observations back, but that costs a round trip per step, adding delay to every Attempt.

### Which candidates follow them reliably

- **Format validity doesn't depend on the model**, because the grammar enforces it (above).
- **Choosing good actions does.** Vendor-reported scores:

| Model | IFEval | IFBench | BFCL-V4 (function calling) | τ²-Bench (agentic tool use) | Source |
| --- | --- | --- | --- | --- | --- |
| Qwen3.5-4B | 89.8 | 59.2 | 50.3 | 79.9 | [card](https://huggingface.co/Qwen/Qwen3.5-4B) |
| Qwen3.5-9B | 91.5 | 64.5 | 66.1 | 79.1 | [Qwen3.5-4B card](https://huggingface.co/Qwen/Qwen3.5-4B) (same table) |
| LFM2.5-8B-A1B | 91.84 | 56.47 | 48.50 | reported per domain only | [card](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B) |
| Gemma 4 E2B / E4B / 12B | not reported | not reported | not reported | 24.5% / 42.2% / 69.0% (average over 3) | [card](https://huggingface.co/google/gemma-4-E4B-it) |
| Ministral 3 3B | not reported | not reported | not reported | not reported | [card](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512) claims "native function calling and JSON outputting" |

Vendors ran these themselves with their own test setups: typically full-precision weights, and for these thinking-capable models presumably with thinking on. The scores can't be compared across vendors, and none of them tests our setup: 4-bit weights, thinking off, our schema. [#6](https://github.com/NikosZisisPD/collaboard/issues/6) has to try the real Companion schema on real Levels.

## 3. Calling Ollama from a browser page on localhost

### CORS and `OLLAMA_ORIGINS`

- Ollama listens on `127.0.0.1:11434` by default ([FAQ](https://docs.ollama.com/faq), [envconfig/config.go](https://github.com/ollama/ollama/blob/v0.34.3/envconfig/config.go)).
- **Default allowed origins** ([config.go](https://github.com/ollama/ollama/blob/v0.34.3/envconfig/config.go#L85-L109)):
  - `http` and `https` on `localhost`, `127.0.0.1`, and `0.0.0.0`, each with and without any port (for example `http://localhost:*`);
  - plus `app://*`, `file://*`, `tauri://*`, `vscode-webview://*`, and `vscode-file://*`.

  `OLLAMA_ORIGINS` adds a comma-separated list on top of these; it doesn't replace them. The [FAQ](https://docs.ollama.com/faq) mentions only `127.0.0.1` and `0.0.0.0`, but the code includes `localhost` too.
- Wildcards match by prefix: Ollama enables `AllowWildcard` in gin-contrib/cors ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L1858-L1889)), and v1.7.2 of that library matches `http://localhost:*` against any `http://localhost:<port>` ([cors config.go](https://github.com/gin-contrib/cors/blob/v1.7.2/config.go#L101-L115)).
- Preflight is handled. The allowed methods are gin-contrib/cors's defaults (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) ([cors.go](https://github.com/gin-contrib/cors/blob/v1.7.2/cors.go#L176-L183)). Allowed headers include `Content-Type` and `Authorization` ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L1858-L1886)).
- A separate Host-header check applies while Ollama listens on loopback, which is the default. It accepts `localhost`, loopback and private IPs, the machine's hostname, and `*.localhost`, `*.local`, and `*.internal`. Anything else gets 403 ([routes.go](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L1787-L1850)). Calling `http://localhost:11434` or `http://127.0.0.1:11434` passes.
- **So a game served from any localhost port needs no configuration.** `OLLAMA_ORIGINS` matters only for other origins, such as a LAN IP. How to set it depends on how Ollama runs:
  - the macOS app: `launchctl setenv`, then restart the app ([FAQ](https://docs.ollama.com/faq));
  - Homebrew's `brew services`: the service definition's environment;
  - a manual `ollama serve`: the shell's environment.
- **Chrome's Local Network Access prompt** (launching in Chrome 142) gates requests "from the public network to a local network or loopback destination". A localhost page isn't on the public network, so no prompt appears. Chrome says it plans to extend the protection later to requests "from a local server to localhost" ([Chrome blog](https://developer.chrome.com/blog/local-network-access)).

### Streaming

- The REST API streams by default as newline-delimited JSON (`application/x-ndjson`). `stream: false` returns one JSON object. The docs call non-streaming "better for short responses, or structured outputs" ([api/streaming.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/api/streaming.mdx)). An error mid-stream arrives as an `{"error": ...}` line, and the HTTP status stays unchanged ([api/errors.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/api/errors.mdx)).
- In a browser, `fetch` plus a reader on `response.body` is enough. The official client [ollama-js](https://github.com/ollama/ollama-js) 0.6.3 (MIT, [npm](https://www.npmjs.com/package/ollama), published 2025-11-13) ships an `ollama/browser` entry that does exactly this: a `TextDecoder` and a split on newlines ([src/utils.ts](https://github.com/ollama/ollama-js/blob/main/src/utils.ts)). It can also cancel a generation through `AbortController` ([src/browser.ts](https://github.com/ollama/ollama-js/blob/main/src/browser.ts), [README](https://github.com/ollama/ollama-js#abort)).
- The Companion can't act until its JSON is complete, so `stream: false` is the simple default. Streaming only helps if the game wants to show progress.
- **Godot's web export can't stream it.** Its HTTP classes list "No chunked responses" and are "Subject to same-origin policy" ([Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). GDScript would use `stream: false`, or call `fetch` through `JavaScriptBridge` (§4).

### Keeping the model loaded (`keep_alive`)

- Models stay loaded for 5 minutes after a request by default. `keep_alive` on `/api/generate` or `/api/chat` takes a duration string, a number of seconds, a negative number to keep the model loaded indefinitely, or `0` to unload right after the reply. The request value overrides the server's `OLLAMA_KEEP_ALIVE` ([FAQ](https://docs.ollama.com/faq), [config.go](https://github.com/ollama/ollama/blob/v0.34.3/envconfig/config.go#L126-L144)).
- **Preload** by sending a request with only the model name, `{"model": "qwen3.5:4b"}`, to either endpoint ([FAQ](https://docs.ollama.com/faq)). For the demo: preload with `keep_alive: -1` when the page opens, and send `keep_alive: -1` with every Attempt too. A request that omits it gets the default of `5m` ([api.md](https://github.com/ollama/ollama/blob/v0.34.3/docs/api.md?plain=1#L58)).
- `OLLAMA_NUM_PARALLEL` defaults to 1, and memory scales with parallel requests times context length ([FAQ](https://docs.ollama.com/faq)). Keep the default.

### Installing (for #6)

- Requirements: macOS 14 Sonoma or newer, and an Apple M-series chip for GPU support ([macos.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/macos.mdx)).
- Install paths:
  - the official DMG ([macos.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/macos.mdx));
  - the Homebrew cask `ollama-app`, which installs the official release build (0.34.2 when checked, [formulae.brew.sh](https://formulae.brew.sh/cask/ollama-app));
  - the Homebrew formula `ollama` (0.34.3).
- The formula builds from source against llama.cpp b10969 and Homebrew's own `mlx-c` (tagged MLX 0.32.1 plus a patch, where upstream targets a later MLX commit). Its `brew services` definition sets `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=q8_0` ([formula JSON](https://formulae.brew.sh/api/formula/ollama.json), [formula source](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/o/ollama.rb)).
- Prompts sent to local models stay on the machine ([FAQ](https://docs.ollama.com/faq)). Cloud models and web search can be switched off with `OLLAMA_NO_CLOUD=1`, or with `"disable_ollama_cloud": true` in `~/.ollama/server.json` (same page).

## 4. A fixed tokenizer for the Prompt Budget

[ADR-0002](https://github.com/NikosZisisPD/collaboard/blob/main/docs/adr/0002-prompt-budget-counts-only-player-text.md) makes the Prompt Budget a game rule counted with a fixed tokenizer, so it doesn't need to match the Companion's model.

### JavaScript options

Versions, dates, licences, and unpacked sizes come from the npm registry. Per-file sizes come from jsDelivr's file listing of each published package. Gzip sizes are my own measurement (`gzip -9`, streamed and not saved).

| Package | Licence, deps | What it is | What you ship for one encoding | Notes |
| --- | --- | --- | --- | --- |
| [gpt-tokenizer](https://www.npmjs.com/package/gpt-tokenizer) 4.0.0 (2026-08-16) | MIT, none | Pure TypeScript byte-pair encoding with every OpenAI encoding ([README](https://github.com/niieani/gpt-tokenizer)) | `cl100k_base` 1,159,216 B (444,727 B gzipped); `o200k_base` 2,431,335 B (1,034,726 B); `r50k_base` 574,791 B (203,616 B); plus roughly 30 KB of core modules ([files](https://data.jsdelivr.com/v1/packages/npm/gpt-tokenizer@4.0.0?structure=flat)) | Synchronous `countTokens()` and `isWithinTokenLimit()`. The default import is `o200k_base`. v4 dropped the UMD bundles, so it's ES modules only ([4.0.0 notes](https://github.com/niieani/gpt-tokenizer/releases/tag/4.0.0)). |
| [js-tiktoken](https://www.npmjs.com/package/js-tiktoken) 1.0.21 (2025-08-09) | MIT, `base64-js` | Pure JavaScript port of OpenAI's tiktoken ([README](https://github.com/dqbd/tiktoken/tree/main/js)) | `cl100k_base` 1,090,808 B (502,937 B gzipped); `o200k_base` 2,325,563 B (1,135,134 B) via `js-tiktoken/lite` ([files](https://data.jsdelivr.com/v1/packages/npm/js-tiktoken@1.0.21?structure=flat)) | The full import carries every encoding (5.6 MB). |
| [tiktoken](https://www.npmjs.com/package/tiktoken) 1.0.22 (2025-08-09) | MIT, none | WebAssembly build of OpenAI's Rust tiktoken | `lite` WASM 1,073,364 B plus a rank file (`cl100k_base` 1,090,763 B) ([files](https://data.jsdelivr.com/v1/packages/npm/tiktoken@1.0.22?structure=flat)) | The full WASM file with every encoding is 5.59 MB. |
| [@huggingface/tokenizers](https://www.npmjs.com/package/@huggingface/tokenizers) 0.2.0 (2026-09-07) | Apache-2.0, none | Loads any Hugging Face `tokenizer.json`, in the browser too ([README](https://github.com/huggingface/tokenizers.js)) | The library is about 37 KB minified ("~ 8.3kB gzip" per the README), plus the model's `tokenizer.json`: Qwen3.5 12.8 MB, Granite 4.1 7.2 MB, Ministral 3 17.1 MB, LFM2.5 17.9 MB, Gemma 4 32.2 MB ([HF API](https://huggingface.co/api/models/Qwen/Qwen3.5-4B?blobs=true)) | The only way to count with the Companion's own tokenizer, which ADR-0002 doesn't need. |
| [tokenx](https://www.npmjs.com/package/tokenx) 2.1.0 (2026-08-05) | MIT, none | A heuristic estimator, not a tokenizer | "Just 2kB" | Self-reports "95%+ average accuracy" against `o200k_base`. Deterministic, and small enough to port to GDScript. |
| [llama3-tokenizer-js](https://www.npmjs.com/package/llama3-tokenizer-js) 1.2.0 (2024-08-05) | MIT, none | Llama 3 byte-pair encoding | 12.9 MB unpacked package | Last published 2024-08-05. |

[@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers) 4.3.0 also tokenizes, but it's a full inference library that depends on `onnxruntime-web` and `onnxruntime-node`, far more than a Prompt Budget needs.

### Fast enough for every keystroke?

- gpt-tokenizer says it has "the fastest encoding, decoding time and a tiny memory footprint" and "initializes faster than all other implementations" ([README](https://github.com/niieani/gpt-tokenizer#benchmarks)). These claims are the library's own.
- Its published chart shows an average encode time of **6.89 µs** for gpt-tokenizer v2.4.0, against 26.20 µs for js-tiktoken 1.0.14 and 61.61 µs for tiktoken 1.0.16 (WASM) ([chart](https://github.com/niieani/gpt-tokenizer/blob/main/docs/fastest.png)). The chart doesn't state the input size, and those versions are older than the ones above.
- Even a hundred times slower, a count would fit easily in one 60 fps frame (16.7 ms). The real cost is parsing the encoding module once at startup, which no primary source quantifies. Measure it once in the build.
- gpt-tokenizer keeps an LRU merge cache of 100,000 pairs by default, adjustable with `setMergeCacheSize` ([README](https://github.com/niieani/gpt-tokenizer#performance-optimization)).
- **A gotcha:** in gpt-tokenizer, "by default, all special tokens are disallowed", and encoding text that contains one throws an error ([README](https://github.com/niieani/gpt-tokenizer#special-tokens)). A player can type `<|endoftext|>`, so the Prompt Budget code must configure special-token handling or catch the error.

### GDScript

- **No GDScript tokenizer library exists.** The Godot Asset Library returns 0 results for "tokenizer", "tiktoken", "bpe", and "token count" ([API search](https://godotengine.org/asset-library/api/asset?filter=tokenizer)). The only GDScript byte-pair-encoding code I found is inside [asallay/godot-llm](https://github.com/asallay/godot-llm/blob/HEAD/llm/common/GGUFTokenizer.gd), an experimental Godot 4.7 project with no licence, so it can't be reused.
- **Using the JavaScript tokenizer from a Godot web export works through `JavaScriptBridge`.** `get_interface()`, `create_callback()`, and `eval()` call page JavaScript from GDScript, and ints and strings convert automatically ([JavaScriptBridge docs](https://docs.godotengine.org/en/stable/tutorials/platform/web/javascript_bridge.html)). The export's **Head Include** or a custom HTML shell can load extra JavaScript ([Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). gpt-tokenizer 4 ships only ES modules, so it needs a `<script type="module">` that imports it and exposes a global function.
- **Other routes:**
  - Port byte-pair encoding and a rank table to GDScript. I didn't research how well that performs.
  - Use a GDExtension. That needs **Extensions Support**, cross-origin isolation headers, and an extension compiled for the web ([Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)).
  - C# is out: "Projects written in C# using Godot 4 currently cannot be exported to the web" (same page).

## 5. Recommendation and trade-offs

### Model: `qwen3.5:4b`

**Why:** It's a small current-generation model with strong vendor-reported instruction following and tool use for its size (IFEval 89.8, τ²-Bench 79.9). It's Apache-2.0, a 3.4 GB download, fits this Mac's GPU with room to spare, and Ollama supports turning its thinking off.

**How #6 should call it** (the verbs are placeholders; the real action format belongs to its own ticket):

```json
{
  "model": "qwen3.5:4b",
  "messages": [
    { "role": "system", "content": "<the Companion's hidden instructions, including the action format in words>" },
    { "role": "user", "content": "<the player's Prompt>" }
  ],
  "think": false,
  "format": {
    "type": "object",
    "properties": {
      "actions": {
        "type": "array",
        "maxItems": 12,
        "items": {
          "type": "object",
          "properties": {
            "verb": { "type": "string", "enum": ["walk", "jump", "push", "wait"] },
            "steps": { "type": "integer", "minimum": 1, "maximum": 10 }
          },
          "required": ["verb"]
        }
      }
    },
    "required": ["actions"]
  },
  "stream": false,
  "keep_alive": -1,
  "options": { "temperature": 0, "seed": 1 }
}
```

POST this to `http://localhost:11434/api/chat`, after a preload request when the page opens.

**Trade-offs and risks:**

- **Thinking must be off on every request.** Forgetting it adds thinking tokens and the second prompt pass.
- **Its recurrent layers make prompt caching depend on Ollama's snapshots.** Check `prompt_eval_cached_count` across Attempts.
- **The default tag includes a vision encoder** the game won't use.
- **The 4,096-token default context** has to hold the hidden instructions, the Level description, the Prompt, and the reply. Raise `num_ctx` if needed, at a memory cost.
- **Sampling is a choice.** Ollama suggests temperature 0 for deterministic structured output, while Qwen recommends 0.7 for non-thinking mode ([card](https://huggingface.co/Qwen/Qwen3.5-4B)).
- **The vendor scores don't cover 4-bit weights with thinking off.**

**Alternatives for #6 to test against it:**

- `ministral-3:3b` (3.0 GB): no thinking mode to manage; Mistral recommends a temperature below 0.1.
- `qwen3.5:9b` (6.6 GB): if 4B chooses poor actions.
- `qwen3.5:4b-mlx` (4.0 GB): an A/B of the MLX engine against llama.cpp. MLX structured outputs are only four weeks old.

### Tokenizer: `gpt-tokenizer` 4.0.0, `cl100k_base`

```js
import { countTokens } from 'gpt-tokenizer/encoding/cl100k_base'
```

**Why:**

- It's a real byte-pair tokenizer, so "tokens" means what players expect, and Level designers can check counts in its [playground](https://gpt-tokenizer.dev/) ([README](https://github.com/niieani/gpt-tokenizer#playground)).
- It's fixed and deterministic, as ADR-0002 requires.
- It has zero dependencies, runs synchronously, and is microseconds per call.
- `cl100k_base` is less than half the size of `o200k_base` (445 KB against 1.03 MB gzipped).

**Trade-offs:**

- It isn't the Companion's tokenizer, by design.
- `o200k_base` is gpt-tokenizer's default and the encoding current OpenAI models use ([README](https://github.com/niieani/gpt-tokenizer#supported-models-and-their-encodings)). Switching is a one-line import change, and it should happen before Level budgets are tuned.
- Typed special-token strings need handling.
- It's JavaScript only. Phaser uses it directly; Godot needs `JavaScriptBridge` in a web export, a GDScript port, or a heuristic like `tokenx`.

**Alternatives:**

- `js-tiktoken/lite` with one rank file: similar size, older release.
- `@huggingface/tokenizers` with the model's `tokenizer.json`: a tiny library but 7–32 MB of data, and it ties the Prompt Budget to one model, which ADR-0002 avoids.

## Open questions / couldn't verify

- **Reply speed on this Mac.** There are no primary-source time-to-first-token or tokens/s figures for any candidate on an M4 Pro. [#6](https://github.com/NikosZisisPD/collaboard/issues/6) should measure them with the usage fields in §1.
- **GGUF or MLX for the chosen model on an M4 Pro.** Ollama's MLX speed claims come from other or unstated hardware, and MLX structured output arrived in v0.33.1 (2026-08-26).
- **Prompt caching with Qwen 3.5's recurrent layers.** Whether cache hits happen with our request pattern on the llama.cpp path is unverified.
- **Companion quality at 4-bit with thinking off.** Vendor scores don't cover it.
- **Tokenizer startup cost.** No primary source gives the time to parse the `cl100k_base` module in a browser. I also didn't verify the exact semantics of gpt-tokenizer's special-token options (whether a typed special token can be counted as plain text).
- **A GDScript port of byte-pair encoding.** Neither its performance nor a licence-compatible starting point was researched.
- **The docs disagree on the default context.** [modelfile.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/modelfile.mdx?plain=1#L146) says 2048, the [FAQ](https://docs.ollama.com/faq) says 4096, and [context-length.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/context-length.mdx) and the [source](https://github.com/ollama/ollama/blob/v0.34.3/server/routes.go#L2066-L2081) say it depends on GPU memory. The FAQ's default-origins sentence also omits `localhost`. This note follows the source.
- **Other browsers and future Chrome.** Chrome may later prompt for localhost-to-localhost requests. I didn't check Safari or Firefox.
- **ollama-js is behind the server.** It hasn't been released since 0.6.3 (2025-11-13). Its README still documents `format` as a string, although Ollama's docs pass a schema object through it ([structured-outputs.mdx](https://github.com/ollama/ollama/blob/v0.34.3/docs/capabilities/structured-outputs.mdx)). Plain `fetch` sidesteps this.
- **Licences not reviewed:** the custom `lfm1.0` licence (`lfm2.5`) and Llama 3.2's licence.
- **A design question for the Companion:** should Attempts be reproducible (temperature 0 and a fixed seed), so the same Prompt always plays out the same way? That would echo ADR-0002's fairness argument, but this note doesn't decide it.
