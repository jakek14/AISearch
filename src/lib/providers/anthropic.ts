/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { normalizeCitations } from "@/lib/citations";
import type { ProviderResult } from "./openai";

function isServerError(e: unknown): boolean {
  const msg = (e as any)?.message || "";
  const type = (e as any)?.error?.type;
  const status = (e as any)?.status || (e as any)?.statusCode;
  return type === "api_error" || (typeof status === "number" && status >= 500) || /Internal server error/i.test(msg);
}

export async function runAnthropic(prompt: string): Promise<ProviderResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey: key });

  // First attempt: with web_search tooling
  const withTools = async () =>
    (await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system:
        "Use web search to ground your answer. Append a 'Sources:' section containing at least 5 unique, diverse raw https URLs (no markdown, one per line).",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
    } as any)) as any;

  // Fallback: no tools, ask for raw URLs so our extractor can capture them
  const withoutTools = async () =>
    (await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system:
        "Answer comprehensively. Append a 'Sources:' section with at least 5 raw https URLs (no markdown, one per line).",
      messages: [{ role: "user", content: prompt }],
    } as any)) as any;

  // Try with tools, retry once on 5xx, then fallback without tools
  let msg: any;
  try {
    try {
      msg = await withTools();
    } catch (e) {
      if (isServerError(e)) {
        // brief backoff and retry once
        await new Promise((r) => setTimeout(r, 500));
        msg = await withTools();
      } else {
        // likely invalid_request (e.g., tools not enabled) → fallback
        msg = await withoutTools();
      }
    }
  } catch {
    // if second attempt with tools failed, fallback without tools
    msg = await withoutTools();
  }

  const text = msg.content?.map((p: any) => p.text).join("\n") ?? "";

  const rawCitations: any[] = msg?.citations ?? msg?.metadata?.citations ?? [];
  const usage = msg?.usage ?? {};

  return {
    text,
    tokensIn: usage?.input_tokens,
    tokensOut: usage?.output_tokens,
    citations: normalizeCitations(rawCitations, "anthropic"),
  };
} 