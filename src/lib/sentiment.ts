import type { Brand } from "@prisma/client";

// Map a rough polarity to 0..100 bins per spec
function binScore(polarity: number): number {
  if (polarity >= 0.75) return 100; // strong positive
  if (polarity >= 0.25) return 80;  // mild positive
  if (polarity > -0.25) return 60;  // neutral/mixed
  if (polarity > -0.75) return 40;  // mild negative
  return 20;                        // strong negative
}

const POSITIVE_STRONG = [
  "best",
  "top",
  "favorite",
  "favourite",
  "editor's pick",
  "editors' pick",
  "winner",
  "award",
  "excellent",
  "outstanding",
  "love",
  "ideal",
  "go-to",
];

const POSITIVE_MILD = [
  "good",
  "great",
  "recommend",
  "solid",
  "reliable",
  "comfortable",
];

const NEGATIVE_STRONG = [
  "avoid",
  "not recommended",
  "don't buy",
  "do not buy",
  "issues",
  "problems",
  "worst",
  "terrible",
  "unsafe",
  "recall",
  "broken",
];

const NEGATIVE_MILD = [
  "cons",
  "drawbacks",
  "expensive",
  "heavy",
  "uncomfortable",
  "poor",
  "bad",
];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function hasNegationNear(text: string, keyword: string): boolean {
  const idx = text.indexOf(keyword);
  if (idx < 0) return false;
  const left = text.slice(Math.max(0, idx - 20), idx + keyword.length);
  return /\bnot\b|\bno\b|n't\b/.test(left);
}

function windowAround(text: string, start: number, size = 200): string {
  const s = Math.max(0, start - size);
  const e = Math.min(text.length, start + size);
  return text.slice(s, e);
}

export function computeBrandSentimentScore(answerText: string, brand: Pick<Brand, "name" | "aliases">): number | null {
  if (!answerText) return null;
  const lower = answerText.toLowerCase();
  const names = [brand.name, ...(brand.aliases || [])].map((n) => n.toLowerCase()).filter(Boolean);

  // Gather mention spans
  const spans: number[] = [];
  for (const name of names) {
    let idx = lower.indexOf(name);
    while (idx >= 0) {
      spans.push(idx);
      idx = lower.indexOf(name, idx + name.length);
    }
  }

  // If appeared inside a numbered list, bias positive
  const lines = lower.split(/\r?\n/);
  const listPositive = lines.some((line) => /^\s*\d+[\.)]\s+/.test(line) && names.some((n) => line.includes(n)));

  // No spans found → no sentiment to score
  if (spans.length === 0) return null;

  // Score each span window
  const spanScores: number[] = [];
  for (const pos of spans) {
    const win = windowAround(lower, pos);
    let polarity = 0; // neutral baseline

    if (includesAny(win, POSITIVE_STRONG)) polarity += 0.9;
    if (includesAny(win, POSITIVE_MILD)) polarity += 0.4;
    if (includesAny(win, NEGATIVE_STRONG)) polarity -= 0.9;
    if (includesAny(win, NEGATIVE_MILD)) polarity -= 0.4;

    // Negation handling: if a positive keyword is negated, flip towards negative, and vice versa
    for (const k of [...POSITIVE_STRONG, ...POSITIVE_MILD]) {
      if (win.includes(k) && hasNegationNear(win, k)) polarity -= 0.6;
    }
    for (const k of [...NEGATIVE_STRONG, ...NEGATIVE_MILD]) {
      if (win.includes(k) && hasNegationNear(win, k)) polarity += 0.6;
    }

    // List recommendation boost
    if (listPositive) polarity += 0.3;

    spanScores.push(binScore(Math.max(-1, Math.min(1, polarity))));
  }

  // Average spans → per-answer score
  const avg = spanScores.reduce((a, b) => a + b, 0) / spanScores.length;
  return Math.round(avg);
} 