import type { VisibilitySnapshot, Brand } from "@prisma/client";

export type RankedRow = {
  brandId: string;
  brandName?: string;
  topic: string;
  provider: string;
  visibilityPct: number;
  rank: number;
  prevRank?: number | null;
};

export function computeRanks(rows: Array<{ brandId: string; topic: string; provider: string; visibilityPct: number }>, prev?: Array<{ brandId: string; topic: string; provider: string; visibilityPct: number }>): RankedRow[] {
  const byKey = (r: { topic: string; provider: string }) => `${r.topic}::${r.provider}`;
  const groups = new Map<string, Array<{ brandId: string; visibilityPct: number; topic: string; provider: string }>>();
  for (const r of rows) {
    const k = byKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const prevByKey = new Map<string, Array<{ brandId: string; visibilityPct: number }>>();
  if (prev) {
    for (const r of prev) {
      const k = byKey(r);
      if (!prevByKey.has(k)) prevByKey.set(k, []);
      prevByKey.get(k)!.push({ brandId: r.brandId, visibilityPct: r.visibilityPct });
    }
  }

  const out: RankedRow[] = [];
  for (const [k, list] of groups) {
    const [topic, provider] = k.split("::");
    list.sort((a, b) => b.visibilityPct - a.visibilityPct);
    const prevList = prevByKey.get(k) || [];
    const prevRankMap = new Map<string, number>();
    prevList
      .slice()
      .sort((a, b) => b.visibilityPct - a.visibilityPct)
      .forEach((r, i) => prevRankMap.set(r.brandId, i + 1));

    list.forEach((r, i) => {
      const rank = i + 1;
      const prevRank = prevRankMap.get(r.brandId) ?? null;
      out.push({ brandId: r.brandId, topic, provider, visibilityPct: r.visibilityPct, rank, prevRank });
    });
  }
  return out;
} 