import { prisma } from "@/lib/prisma";
import { computeRanks } from "@/lib/ranking";

const CITATION_WEIGHT = 1.2;

export async function recomputeDailyBrandRankings(date: Date = new Date()): Promise<{ written: number }> {
  const brands = await prisma.brand.findMany();
  const topics = await prisma.prompt.findMany({ select: { topic: true }, distinct: ["topic"] });
  const providers = ["openai", "anthropic", "gemini"] as const;

  let written = 0;
  for (const topicRow of topics) {
    const topic = topicRow.topic;
    for (const provider of providers) {
      // Compute visibility per brand as mean of per-prompt visibilities
      const perBrand: Array<{ brandId: string; topic: string; provider: string; visibilityPct: number }> = [];
      for (const brand of brands) {
        const prompts = await prisma.prompt.findMany({ where: { org: { brands: { some: { id: brand.id } } }, topic } });
        if (prompts.length === 0) continue;
        const promptIds = prompts.map((p) => p.id);
        const latestRuns = await prisma.providerRun.findMany({
          where: { promptId: { in: promptIds }, provider },
          orderBy: { finishedAt: "desc" },
          take: 200,
          include: { answer: { include: { citations: true, mentions: true } } },
        });
        const byPrompt = new Map<string, number>();
        for (const run of latestRuns) {
          if (!run.answer) continue;
          const citedBrand = run.answer.citations.some((c) => brand.domains.includes(c.domain));
          const mentioned = run.answer.mentions.some((m) => m.brandId === brand.id);
          const vis = mentioned || citedBrand ? (citedBrand ? CITATION_WEIGHT : 1) : 0;
          byPrompt.set(run.promptId, Math.min(1, vis));
        }
        const visVals = Array.from(byPrompt.values());
        const mean = visVals.length ? (visVals.reduce((a, b) => a + b, 0) / visVals.length) * 100 : 0;
        perBrand.push({ brandId: brand.id, topic, provider, visibilityPct: Math.round(mean * 10) / 10 });
      }

      // Previous day for deltas
      const prevDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      const prev = await prisma.brandRankingSnapshot.findMany({ where: { topic, provider, date: { gte: new Date(prevDate.toDateString()) } } });
      const ranks = computeRanks(perBrand, prev.map((p) => ({ brandId: p.brandId, topic: p.topic, provider: p.provider, visibilityPct: p.visibilityPct })));

      for (const r of ranks) {
        await prisma.brandRankingSnapshot.create({ data: { brandId: r.brandId, topic, provider, date, visibilityPct: r.visibilityPct, rank: r.rank, prevRank: r.prevRank ?? undefined } });
        written++;
      }
    }
  }
  return { written };
} 