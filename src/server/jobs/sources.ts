import { prisma } from "@/lib/prisma";

export async function recomputeSourceAgg(windowDays: number = 7): Promise<{ written: number }> {
  const brands = await prisma.brand.findMany();
  const providers = ["openai", "anthropic", "gemini"] as const;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  let written = 0;

  for (const brand of brands) {
    for (const provider of providers) {
      const runs = await prisma.providerRun.findMany({
        where: { provider, prompt: { org: { id: brand.orgId } }, finishedAt: { gte: since } },
        include: { answer: { include: { citations: true } } },
      });
      const domainToCount = new Map<string, number>();
      for (const run of runs) {
        const cites = run.answer?.citations || [];
        for (const c of cites) {
          domainToCount.set(c.domain, (domainToCount.get(c.domain) || 0) + 1);
        }
      }
      const entries = Array.from(domainToCount.entries()).sort((a, b) => b[1] - a[1]);
      const windowStart = since;
      const windowEnd = new Date();
      for (const [domain, citations] of entries) {
        await prisma.sourceAgg.create({ data: { brandId: brand.id, provider, domain, citations, windowStart, windowEnd } });
        written++;
      }
    }
  }
  return { written };
} 