import type { ProviderResult } from "./openai";
import { runOpenAI } from "./openai";
import { runAnthropic } from "./anthropic";
import { runGemini } from "./gemini";

export type ProviderName = "openai" | "anthropic" | "gemini";

export const providerRunners: Record<ProviderName, (prompt: string) => Promise<ProviderResult>> = {
  openai: runOpenAI,
  anthropic: runAnthropic,
  gemini: runGemini,
};

export const tokenPricesUSD: Record<ProviderName, { input: number; output: number }> = {
  // $/1K tokens (example static pricing; adjust as needed)
  openai: { input: 0.15, output: 0.60 }, // gpt-4.1-mini approx
  anthropic: { input: 3.00, output: 15.00 }, // claude-3.5 sonnet
  gemini: { input: 0.075, output: 0.30 }, // gemini 1.5 flash approx
};

export function estimateCostUsd(provider: ProviderName, tokensIn?: number, tokensOut?: number): number {
  const p = tokenPricesUSD[provider];
  const inK = (tokensIn ?? 0) / 1000;
  const outK = (tokensOut ?? 0) / 1000;
  return Number((inK * p.input + outK * p.output).toFixed(6));
} 