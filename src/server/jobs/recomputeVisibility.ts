import { prisma } from "@/lib/prisma";

const CITATION_WEIGHT = 1.0; // set to 1.2 to weight citations higher

export async function recomputeVisibilitySnapshots(): Promise<{ updated: number }> {
  const brands = await prisma.brand.findMany({});
  let updated = 0;
  for (const brand of brands) {
    const providers = ["openai", "anthropic", "gemini"] as const;
    for (const provider of providers) {
      // Pull recent runs per provider for org
      const runs = await prisma.providerRun.findMany({
        where: { prompt: { org: { id: brand.orgId } }, provider },
        orderBy: { finishedAt: "desc" },
        take: 200,
        include: { answer: { include: { citations: true, mentions: true } }, prompt: true },
      });
      if (runs.length === 0) continue;

      // Compute per-prompt visibility: 1 if mentioned or cited
      const byPrompt = new Map<string, number[]>();
      for (const r of runs) {
        const mentioned = r.answer?.mentions?.some((m) => m.brandId === brand.id) ?? false;
        const cited = (r.answer?.citations || []).some((c) => brand.domains.includes(c.domain));
        const vis = mentioned || cited ? 1 * (cited ? CITATION_WEIGHT : 1) : 0;
        const arr = byPrompt.get(r.promptId) || [];
        arr.push(vis);
        byPrompt.set(r.promptId, arr);
      }
      // Average per prompt, then overall mean
      const perPrompt = Array.from(byPrompt.values()).map((arr) => arr.reduce((a, b) => a + b, 0) / arr.length);
      const mean = perPrompt.reduce((a, b) => a + b, 0) / perPrompt.length;
      const visibilityPct = Math.round((mean * 100 + Number.EPSILON) * 100) / 100;

      await prisma.visibilitySnapshot.create({
        data: {
          brandId: brand.id,
          topic: "overall", // can be refined by prompt.topic
          provider,
          visibilityPct,
        },
      });
      updated += 1;
    }
  }
  return { updated };
} 