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

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{label}</div>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default async function KPICards({ orgId }: { orgId: string }) {
  const k = await getKpis(orgId);
  const items = [
    { label: "Runs (7d)", value: k.runs7d.toLocaleString(), accent: "#3b82f6" },
    { label: "New Citations (7d)", value: k.newCitations7d.toLocaleString(), accent: "#10b981" },
    { label: "Est. Cost (7d)", value: `$${k.estCost7d.toFixed(2)}`, accent: "#f59e0b" },
    { label: "Prompts Tracked", value: k.promptsTracked.toLocaleString(), accent: "#8b5cf6" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} label={it.label} value={it.value} accent={it.accent} />
      ))}
    </div>
  );
} 