import { prisma } from "@/lib/prisma";

async function getKpis(orgId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const runs = await prisma.providerRun.count({
    where: { prompt: { orgId }, finishedAt: { gte: since } },
  });
  const citations = await prisma.citation.count({
    where: { answer: { run: { prompt: { orgId }, finishedAt: { gte: since } } } },
  });
  const costAgg = await prisma.providerRun.aggregate({
    _sum: { costUsd: true },
    where: { prompt: { orgId }, finishedAt: { gte: since } },
  });
  const prompts = await prisma.prompt.count({ where: { orgId } });

  return {
    runs7d: runs,
    newCitations7d: citations,
    estCost7d: Number(costAgg._sum.costUsd || 0),
    promptsTracked: prompts,
  };
}

export default async function KPICards({ orgId }: { orgId: string }) {
  const k = await getKpis(orgId);
  const items = [
    { label: "Runs (7d)", value: k.runs7d.toLocaleString() },
    { label: "New Citations (7d)", value: k.newCitations7d.toLocaleString() },
    { label: "Est. Cost (7d)", value: `$${k.estCost7d.toFixed(2)}` },
    { label: "Prompts Tracked", value: k.promptsTracked.toLocaleString() },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">{it.label}</div>
          <div className="mt-1 text-2xl font-semibold">{it.value}</div>
        </div>
      ))}
    </div>
  );
} 