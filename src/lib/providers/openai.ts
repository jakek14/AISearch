/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import { normalizeCitations, NormalizedCitation } from "@/lib/citations";

export type ProviderResult = {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
  citations: NormalizedCitation[];
};

export async function runOpenAI(prompt: string): Promise<ProviderResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: key });

  const response = (await client.responses.create({
    model: "gpt-4.1-mini",
    input: `Answer the user question. Use web search to ground your answer. Include at least 5 diverse sources with URLs.\n\nQuestion: ${prompt}`,
    tools: [{ type: "web_search_preview" as any }],
  })) as any;

  const text = response.output_text || "";

  const rawCitations: any[] = response?.web_search?.results ?? response?.citations ?? [];
  const usage = response?.usage ?? {};

  return {
    text,
    tokensIn: usage?.input_tokens,
    tokensOut: usage?.output_tokens,
    citations: normalizeCitations(rawCitations, "openai"),
  };
} 