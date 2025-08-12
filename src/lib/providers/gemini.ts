/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeCitations } from "@/lib/citations";
import type { ProviderResult } from "./openai";

export async function runGemini(prompt: string): Promise<ProviderResult> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `Use Google Search retrieval to ground the answer. Include at least 5 diverse sources with URLs.\n\nQuestion: ${prompt}` }] }],
    tools: [
      {
        google_search_retrieval: {
          dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" },
        },
      } as any,
    ],
  } as any);

  const response = result.response as any;
  const text = response.text();

  let rawCitations: any[] = [];
  const grounding = response?.groundingMetadata;
  if (grounding?.supportingContent || grounding?.groundingChunks) {
    rawCitations = grounding.supportingContent ?? grounding.groundingChunks ?? [];
  } else if (Array.isArray(response?.candidates)) {
    for (const c of response.candidates) {
      const gm = c?.groundingMetadata;
      if (gm?.supportingContent || gm?.groundingChunks) {
        rawCitations = gm.supportingContent ?? gm.groundingChunks ?? [];
        break;
      }
    }
  }

  const usage = response?.usageMetadata ?? {};

  return {
    text,
    tokensIn: usage?.promptTokenCount,
    tokensOut: usage?.candidatesTokenCount ?? usage?.totalTokenCount,
    citations: normalizeCitations(rawCitations, "gemini"),
  };
} 