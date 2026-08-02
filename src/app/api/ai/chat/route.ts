import { NextResponse } from "next/server";
import { z } from "zod";
import { runReadTool } from "@/lib/ai/execute";
import { ACTION_TOOLS, READ_TOOLS, SYSTEM_PROMPT } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * The assistant.
 *
 * Groq's chat completions API, which is OpenAI-compatible, called directly.
 * Tool calling here is a loop the server drives, and the loop is where the
 * safety model lives:
 *
 *   read tool   -> executed immediately, result fed back, loop continues
 *   action tool -> NOT executed. The loop stops and the call is returned to the
 *                  browser as a proposal for a person to approve.
 *
 * So the model can look at anything and change nothing. Approving a proposal in
 * the UI calls the ordinary REST endpoint for that action, which keeps every
 * guard those endpoints already have — the assistant is a way to reach them, not
 * a way around them.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Chosen for tool calling rather than prose. It is the largest Groq model that
 * lists `tools` among its supported features, which is the whole job here.
 */
const MODEL = "llama-3.3-70b-versatile";

/** Enough hops to read two or three things and then answer. */
const MAX_TOOL_ROUNDS = 4;

/*
 * Groq's free tier limits tokens per minute, not requests — 12,000 on this
 * plan. Every round resends the tool list, the system prompt and every earlier
 * tool result, so an uncapped result set will exhaust a minute's budget in one
 * question. Results are trimmed to this before going back into the
 * conversation; the model needs enough to answer, not the whole table.
 */
const MAX_RESULT_CHARS = 2400;

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  toolCallId: z.string().optional(),
  name: z.string().optional(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not set, so the assistant is unavailable. Add it in your environment and redeploy.",
        code: "no_api_key",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  const conversation: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...parsed.data.messages.map((m) =>
      m.role === "tool"
        ? { role: "tool", content: m.content, tool_call_id: m.toolCallId, name: m.name }
        : { role: m.role, content: m.content },
    ),
  ];

  /** Everything the model looked at, so the UI can show its working. */
  const used: { name: string; input: unknown; result: unknown }[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const reply = await callGroq(key, conversation);
      const calls = (reply.tool_calls ?? []) as ToolCall[];

      if (calls.length === 0) {
        return NextResponse.json({
          message: typeof reply.content === "string" ? reply.content : "",
          toolsUsed: used,
          proposals: [],
        });
      }

      /*
       * A proposal ends the turn even if the model asked for reads alongside
       * it. Executing the reads and looping would let the model revise or
       * withdraw its own proposal before anyone saw it, and the point is that a
       * person sees exactly what was proposed.
       */
      const actions = calls.filter((c) => ACTION_TOOLS.some((t) => t.name === c.function.name));
      if (actions.length > 0) {
        return NextResponse.json({
          message: typeof reply.content === "string" ? reply.content : "",
          toolsUsed: used,
          proposals: actions.map((c) => ({
            id: c.id,
            tool: c.function.name,
            input: safeParse(c.function.arguments),
          })),
        });
      }

      conversation.push({ role: "assistant", content: reply.content ?? "", tool_calls: calls });

      for (const call of calls) {
        const input = safeParse(call.function.arguments);
        const result = await runReadTool(call.function.name, input);
        used.push({ name: call.function.name, input, result });

        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: compact(result),
        });
      }
    }

    // Out of rounds. Better to say so than to return whatever half-answer the
    // model had; a wrong number stated confidently is the failure that matters.
    return NextResponse.json({
      message:
        "I looked at several things but could not settle on an answer. Try asking for one thing at a time.",
      toolsUsed: used,
      proposals: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The assistant could not answer." },
      { status: 502 },
    );
  }
}

async function callGroq(
  key: string,
  messages: Record<string, unknown>[],
): Promise<{ content?: string | null; tool_calls?: unknown }> {
  /*
   * Rate limits are the normal case on Groq's free tier, not an exception: a
   * question that needs three tool rounds is three requests in a few seconds.
   * A 429 is retried after the delay Groq itself asks for, so an ordinary
   * question does not fail in the user's face over a one-second wait.
   */
  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: toolSpecs(),
        tool_choice: "auto",
        // Low, deliberately. This answers questions about a real business from
        // real figures; inventiveness is not a quality anyone wants here.
        temperature: 0.2,
        max_tokens: 1200,
      }),
      cache: "no-store",
    });

    if (response.status !== 429) break;

    const wait = retryAfterMs(response);
    // Only worth waiting for a short cooldown. A minute-long one is a quota
    // problem, and telling the operator that beats silently hanging.
    if (wait > 12_000 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => "") : "";
    throw new Error(describeGroqError(response?.status ?? 0, detail));
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: unknown } }[];
  };

  const message = json.choices?.[0]?.message;
  if (!message) throw new Error("Groq returned no message.");
  return message;
}

/** How long Groq asked us to wait, in milliseconds. */
function retryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  // Groq usually answers in fractions of a second; a missing header means a
  // short, polite default rather than giving up immediately.
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 250 : 1500;
}

function describeGroqError(status: number, detail: string): string {
  if (status === 401) return "Groq rejected the API key. Check GROQ_API_KEY.";
  if (status === 429) {
    return (
      "Groq's rate limit for this key is still in effect after retrying. " +
      "Free-tier keys allow only a few requests a minute — wait a minute, or " +
      "use a key with a higher limit."
    );
  }

  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    if (parsed.error?.message) return `Groq: ${parsed.error.message}`;
  } catch {
    // Fall through to the generic message below.
  }
  return `Groq returned ${status}.`;
}

/** The tool list, in the shape the chat completions API expects. */
function toolSpecs() {
  return [...READ_TOOLS, ...ACTION_TOOLS].map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema, { io: "input" }),
    },
  }));
}

/**
 * A tool result, small enough to send back repeatedly.
 *
 * Truncation is announced rather than silent: a model that is handed a cut-off
 * list and told nothing will happily state a total it cannot see.
 */
function compact(result: Record<string, unknown>): string {
  const full = JSON.stringify(result);
  if (full.length <= MAX_RESULT_CHARS) return full;

  return `${full.slice(0, MAX_RESULT_CHARS)}… [truncated — this is a partial list. Say so rather than quoting a total from it.]`;
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
