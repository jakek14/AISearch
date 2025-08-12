import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = {
  domain: string;
  usedPct: number; // 0..1
  avgCitations: number;
  type: "Editorial" | "UGC" | "Other";
};

function classifyDomain(domain: string): Row["type"] {
  const d = domain.toLowerCase();
  const isUGC = [
    "youtube.com",
    "youtu.be",
    "reddit.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "medium.com",
    "stackoverflow.com",
    "stackexchange.com",
    "quora.com",
    "github.com"
  ].some((h) => d.endsWith(h) || d.includes(`.${h}`));
  if (isUGC) return "UGC";
  // Heuristic: docs, blogs likely editorial
  if (/blog\.|news\.|docs\.|learn\.|developer\./i.test(d)) return "Editorial";
  return "Other";
}

export default async function SourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const providerParam = sp.provider && sp.provider !== "all" ? sp.provider : undefined;
  const days = Math.max(1, Number(sp.days || "7"));

  let rows: Row[] = [];
  let totalRuns = 0;

  try {
    // Resolve a brand/org scope
    const org = await prisma.org.findFirst();
    const brand = org ? await prisma.brand.findFirst({ where: { orgId: org.id } }) : null;

    if (brand) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const runs = await prisma.providerRun.findMany({
        where: {
          finishedAt: { gte: since },
          ...(providerParam ? { provider: providerParam } : {}),
          prompt: { orgId: brand.orgId },
        },
        orderBy: { finishedAt: "desc" },
        include: { answer: { include: { citations: true } } },
      });
      totalRuns = runs.length || 1; // avoid divide by zero

      const domainToUsage = new Map<string, { chats: number; totalCitations: number }>();

      for (const run of runs) {
        const citations = run.answer?.citations ?? [];
        if (!citations.length) continue;
        const domainsInThisRun = new Map<string, number>();
        for (const c of citations) {
          const count = domainsInThisRun.get(c.domain) || 0;
          domainsInThisRun.set(c.domain, count + 1);
        }
        for (const [domain, count] of domainsInThisRun.entries()) {
          const agg = domainToUsage.get(domain) || { chats: 0, totalCitations: 0 };
          agg.chats += 1;
          agg.totalCitations += count;
          domainToUsage.set(domain, agg);
        }
      }

      rows = Array.from(domainToUsage.entries())
        .map(([domain, agg]) => ({
          domain,
          usedPct: agg.chats / totalRuns,
          avgCitations: agg.totalCitations / Math.max(1, agg.chats),
          type: classifyDomain(domain),
        }))
        .sort((a, b) => b.usedPct - a.usedPct)
        .slice(0, 100);
    }
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sources</h1>

      <form className="flex flex-wrap items-center gap-2 rounded border bg-white p-3">
        <label className="text-sm text-gray-600">Range</label>
        <select name="days" defaultValue={String(days)} className="rounded border px-2 py-1">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <label className="ml-2 text-sm text-gray-600">Provider</label>
        <select name="provider" defaultValue={sp.provider || "all"} className="rounded border px-2 py-1">
          <option value="all">All</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
        </select>
        <button className="ml-auto rounded bg-black px-3 py-1 text-sm text-white">Apply</button>
      </form>

      <div className="overflow-hidden rounded border bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Used</th>
              <th className="px-3 py-2">Avg. Citations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.domain} className="border-t">
                <td className="px-3 py-2">{r.domain}</td>
                <td className="px-3 py-2">
                  <span className={
                    r.type === "Editorial"
                      ? "rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                      : r.type === "UGC"
                      ? "rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                      : "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  }>
                    {r.type}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{Math.round(r.usedPct * 100)}%</td>
                <td className="px-3 py-2 tabular-nums">{r.avgCitations.toFixed(1)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-600">
                  No data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 