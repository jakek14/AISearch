import { prisma } from "@/lib/prisma";

export default async function UnderperformingPrompts({ orgId, provider, days = 30 }: { orgId: string; provider?: string; days?: number }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const runs = await prisma.providerRun.findMany({
    where: { prompt: { orgId }, provider: provider ? provider : undefined, finishedAt: { gte: since } },
    include: { answer: { include: { citations: true, mentions: true } }, prompt: true },
    take: 200,
  });
  const promptIdToScores = new Map<string, { prompt: string; score: number; n: number }>();
  for (const r of runs) {
    const mentioned = (r.answer?.mentions || []).some((m) => m.brandId === r.prompt.orgId);
    const cited = (r.answer?.citations || []).length > 0;
    const per = mentioned || cited ? 1 : 0;
    const rec = promptIdToScores.get(r.promptId) || { prompt: r.prompt.text, score: 0, n: 0 };
    rec.score += per;
    rec.n += 1;
    promptIdToScores.set(r.promptId, rec);
  }
  const rows = Array.from(promptIdToScores.values())
    .map((r) => ({ prompt: r.prompt, visibility: r.n ? Math.round((r.score / r.n) * 100) : 0 }))
    .sort((a, b) => a.visibility - b.visibility)
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-gray-700">Underperforming Prompts</div>
      <ul className="divide-y text-sm">
        {rows.map((r, idx) => (
          <li key={idx} className="py-2">
            <div className="truncate text-gray-700">{r.prompt}</div>
            <div className="text-xs text-gray-500">Visibility {r.visibility}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 