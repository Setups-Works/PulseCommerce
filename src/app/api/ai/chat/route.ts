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
 * Chosen for tool calling rather than prose, and overridable.
 *
 * gpt-oss-120b, not a Llama model, and the reason is tool calling rather than
 * prose. With fifteen tools in play the Llama models intermittently emit their
 * *text* call format instead of a real one —
 * `<function=find_product{"query": "…"}</function>` — which Groq rejects
 * outright as "Failed to call a function". gpt-oss produced a clean call every
 * time under the same load.
 *
 * The fallback exists because Groq caps each model separately per day, and a
 * day of real use reaches those caps. A plainer answer beats no answer, and the
 * response reports which model gave it so nobody wonders why quality moved.
 */
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile";

/** Enough hops to read two or three things and then answer. */
const MAX_TOOL_ROUNDS = 4;

/*
 * Groq's free tier limits tokens per minute, not requests — 12,000 on this
 * plan. Every round resends the tool list, the system prompt and every earlier
 * tool result, so an uncapped result set will exhaust a minute's budget in one
 * question. Results are trimmed to this before going back into the
 * conversation; the model needs enough to answer, not the whole table.
 */
const MAX_RESULT_CHARS = 1600;

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

  /** Swapped to the fallback for the rest of the turn once quota is hit. */
  const model = { name: MODEL, degraded: false };

  /*
   * Whether to send the action tools at all.
   *
   * Every tool's schema and description rides on every request, and the free
   * tier meters tokens per minute — sixteen tools was most of a 3,000-token
   * request, which one question could not fit inside an 8,000/minute budget.
   * Most questions are analytics and can never need an action tool, so those
   * are only offered when the operator's own words suggest one. A false
   * negative costs a follow-up; sending everything always cost the answer.
   */
  const wantsAction = /\b(send|message|msg|text|whatsapp|draft|report|pdf|excel|csv|turn (on|off)|enable|disable|start|pause|menu|flow|coupon|announce|notify)\b/i.test(
    parsed.data.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" "),
  );

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const reply = await callGroq(key, conversation, model, wantsAction);
      const calls = (reply.tool_calls ?? []) as ToolCall[];

      if (calls.length === 0) {
        return NextResponse.json({
          message: typeof reply.content === "string" ? reply.content : "",
          toolsUsed: used,
          proposals: [],
          model: model.name,
          degraded: model.degraded,
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
          proposals: actions.map((c) => {
            const { input, dropped } = vetUrls(
              attachProduct(safeParse(c.function.arguments), used),
              used,
            );
            return { id: c.id, tool: c.function.name, input, droppedUrls: dropped };
          }),
          model: model.name,
          degraded: model.degraded,
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
  model: { name: string; degraded: boolean },
  withActions: boolean,
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
        model: model.name,
        messages,
        tools: toolSpecs(withActions),
        tool_choice: "auto",
        // Low, deliberately. This answers questions about a real business from
        // real figures; inventiveness is not a quality anyone wants here.
        temperature: 0.2,
        max_tokens: 700,
      }),
      cache: "no-store",
    });

    if (response.status !== 429) break;

    const detail = await response.clone().text().catch(() => "");

    /*
     * A daily cap is not something waiting solves. Drop to the smaller model
     * once and carry on; only a short per-minute cooldown is worth sleeping
     * through.
     */
    if (/per day|TPD/i.test(detail) && model.name !== FALLBACK_MODEL) {
      model.name = FALLBACK_MODEL;
      model.degraded = true;
      continue;
    }

    const wait = retryAfterMs(response);
    if (wait > 12_000 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => "") : "";
    // Logged in full: Groq's failed_generation says exactly which tool call it
    // could not produce, and that never survives into a user-facing message.
    console.error("[groq]", response?.status, detail.slice(0, 2000));
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
    /*
     * Groq's own message distinguishes a per-minute cooldown from an exhausted
     * daily quota, and says how much is left. Paraphrasing it lost that: an
     * earlier version told people to "wait a minute" when the real answer was
     * "this key is done until tomorrow".
     */
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } };
      if (parsed.error?.message) return `Groq rate limit — ${parsed.error.message}`;
    } catch {
      // Fall through.
    }
    return "Groq is rate-limiting this key. Wait a moment and try again.";
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
function toolSpecs(withActions: boolean) {
  const tools = withActions ? [...READ_TOOLS, ...ACTION_TOOLS] : READ_TOOLS;
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: allowNulls(z.toJSONSchema(tool.schema, { io: "input" })),
    },
  }));
}

/**
 * Lets every optional parameter be null as well as absent.
 *
 * Models express "I am not narrowing this" as `null` far more often than by
 * omitting the key — and Groq validates the call against this schema before we
 * ever see it, so `"/from": expected string, but got null` kills the turn over
 * a distinction nobody meant. Widening the type is one line here instead of a
 * caveat on every parameter, and the executors already treat null as absent.
 *
 * Done by extending `type` rather than wrapping in anyOf: unions made the model
 * fail to produce a call at all.
 */
function allowNulls(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  const node = schema as Record<string, unknown>;

  if (node.properties && typeof node.properties === "object") {
    const required = new Set(Array.isArray(node.required) ? (node.required as string[]) : []);

    for (const [name, raw] of Object.entries(node.properties as Record<string, unknown>)) {
      if (required.has(name) || !raw || typeof raw !== "object") continue;
      const property = raw as Record<string, unknown>;

      if (typeof property.type === "string") {
        property.type = [property.type, "null"];
      }
      // Enums need the value listed too, not just the type widened.
      if (Array.isArray(property.enum) && !property.enum.includes(null)) {
        property.enum = [...property.enum, null];
      }
      allowNulls(property);
    }
  }

  if (node.items) allowNulls(node.items);
  return node;
}

/**
 * Fills in the product photo and link the model looked up but forgot to attach.
 *
 * Asked for a message "about Olive Oil Pomace with its photo and buy link", the
 * model reliably calls find_product and then reliably omits both fields from
 * the proposal — twice over, with the requirement stated in the tool schema and
 * again in the prompt. Since the lookup did happen, the answer is in this
 * turn's results, so it is taken from there rather than asked for a third time.
 *
 * Only ever fills a field the model left empty; anything it did supply stands
 * and is vetted separately.
 */
function attachProduct(
  input: Record<string, unknown>,
  used: { name: string; result: unknown }[],
): Record<string, unknown> {
  if (input.imageUrl && input.productUrl) return input;

  const lookup = [...used].reverse().find((u) => u.name === "find_product");
  const product = (lookup?.result as { products?: Record<string, string>[] } | undefined)
    ?.products?.[0];
  if (!product) return input;

  return {
    ...input,
    imageUrl: input.imageUrl || product.imageUrl || undefined,
    productUrl: input.productUrl || product.productUrl || undefined,
  };
}

/**
 * Removes any URL the model did not get from a tool.
 *
 * Enforced here rather than asked for in the prompt, because asking does not
 * work: told plainly never to invent a link, the smaller model still proposed
 * "https://example.com/manjistha-powder.jpg" without calling find_product at
 * all. A prompt is a request; this is a rule.
 *
 * Anything not present in this turn's tool results is dropped, and the drop is
 * reported so the UI can say a link was removed rather than quietly shipping a
 * message that is missing the thing it was about.
 */
function vetUrls(
  input: Record<string, unknown>,
  used: { result: unknown }[],
): { input: Record<string, unknown>; dropped: string[] } {
  const seen = JSON.stringify(used.map((u) => u.result));
  const dropped: string[] = [];
  const vetted = { ...input };

  for (const field of ["imageUrl", "productUrl"]) {
    const value = vetted[field];
    if (typeof value !== "string" || !value) continue;

    if (!seen.includes(value)) {
      dropped.push(value);
      delete vetted[field];
    }
  }

  return { input: vetted, dropped };
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
