/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeCitations } from "@/lib/citations";
import type { ProviderResult } from "./openai";

export async function runGemini(prompt: string): Promise<ProviderResult> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  const genAI = new GoogleGenerativeAI(key);

  const candidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  async function tryModel(modelName: string) {
    const model = genAI.getGenerativeModel({ model: modelName });
    return (await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Answer concisely in 5-7 bullet points. After the bullets, output exactly 5 raw https URLs under a 'Sources:' heading (one per line, no markdown).\n\nQuestion: ${prompt}`,
            },
          ],
        },
      ],
      tools: [
        {
          google_search_retrieval: {
            dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" },
          },
        } as any,
      ],
      generationConfig: { maxOutputTokens: 500 } as any,
    } as any));
  }

  let result: any | null = null;
  let lastErr: any = null;
  for (const m of candidates) {
    try {
      result = await tryModel(m);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!result) throw lastErr || new Error("Gemini call failed");

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