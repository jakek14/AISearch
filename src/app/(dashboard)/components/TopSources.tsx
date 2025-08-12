import { prisma } from "@/lib/prisma";

export default async function TopSources({ brandId, provider, days = 30 }: { brandId: string; provider?: string; days?: number }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.citation.groupBy({
    by: ["domain"],
    _count: { domain: true },
    where: {
      answer: {
        run: {
          prompt: { org: { brands: { some: { id: brandId } } } },
          provider: provider ? provider : undefined,
          finishedAt: { gte: since },
        },
      },
    },
    orderBy: { _count: { domain: "desc" } },
    take: 8,
  });
  const total = rows.reduce((a, r) => a + r._count.domain, 0) || 1;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Top Sources</div>
      </div>
      <ul className="divide-y text-sm">
        {rows.map((r) => (
          <li key={r.domain} className="flex items-center justify-between py-2">
            <span className="truncate text-gray-700">{r.domain}</span>
            <span className="tabular-nums text-gray-500">{Math.round((r._count.domain / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 