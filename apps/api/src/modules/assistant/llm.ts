import { UpstreamError } from "@nobar/common";
import type { ApiConfig } from "../../config";
import { FakeLlmProvider } from "./fake-llm";

// The only door to a language model (CLAUDE.md: provider-agnostic). The assistant talks to this interface;
// which model answers is a configuration choice.

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema of the arguments */
  parameters: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools: ToolSpec[];
  maxTokens: number;
}

export interface ChatResult {
  /** final text when there are no tool calls */
  content: string;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  chat(request: ChatRequest): Promise<ChatResult>;
}

export const LLM_PROVIDER = Symbol.for("nobar.assistant.llm");

export class LlmUnavailableError extends UpstreamError {
  constructor(cause: string) {
    super("llm", 503, "ASSISTANT_UNAVAILABLE", "دستیار الان در دسترس نیست؛ از جست‌وجوی معمولی استفاده کنید.", { cause });
  }
}

interface OpenAiReply {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Any server that speaks the OpenAI chat-completions protocol: a self-hosted open model (vLLM, Ollama,
 * llama.cpp) or a hosted service with a compatible endpoint.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = "openai-compatible";
  private readonly base: string;

  constructor(
    baseUrl: string,
    readonly model: string,
    private readonly apiKey: string | undefined,
    private readonly timeoutMs = 30_000,
  ) {
    this.base = baseUrl.replace(/\/$/, "");
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const messages = request.messages.map((m) => {
      if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
      if (m.role === "assistant" && m.toolCalls?.length)
        return { role: "assistant", content: m.content || null, tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) } })) };
      return { role: m.role, content: m.content };
    });
    let reply: OpenAiReply;
    try {
      const res = await fetch(`${this.base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: request.maxTokens,
          ...(request.tools.length ? { tools: request.tools.map((t) => ({ type: "function", function: t })), tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      reply = (await res.json()) as OpenAiReply;
    } catch (e) {
      throw new LlmUnavailableError(e instanceof Error ? e.message : String(e));
    }
    const message = reply.choices?.[0]?.message;
    if (!message) throw new LlmUnavailableError("empty reply");
    const toolCalls = (message.tool_calls ?? []).map((c) => {
      let args: unknown = {};
      try {
        args = JSON.parse(c.function.arguments || "{}");
      } catch {
        // left empty: the tool's own validation answers the model with what is wrong
      }
      return { id: c.id, name: c.function.name, arguments: args };
    });
    return { content: message.content ?? "", toolCalls, usage: { inputTokens: reply.usage?.prompt_tokens ?? 0, outputTokens: reply.usage?.completion_tokens ?? 0 } };
  }
}

/** Picks the model by configuration. A new provider is one more class implementing LlmProvider and one more name in LLM_PROVIDER. */
export function createLlmProvider(config: ApiConfig): LlmProvider {
  if (config.LLM_PROVIDER === "openai-compatible") {
    if (!config.LLM_BASE_URL || !config.LLM_MODEL) throw new Error("LLM_BASE_URL and LLM_MODEL are required when LLM_PROVIDER=openai-compatible");
    return new OpenAiCompatibleProvider(config.LLM_BASE_URL, config.LLM_MODEL, config.LLM_API_KEY, config.LLM_TIMEOUT_MS);
  }
  return new FakeLlmProvider();
}
