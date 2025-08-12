import { prisma } from "@/lib/prisma";
import SourceUsageChart, { type UsagePoint } from "./SourceUsageChart";

export const dynamic = "force-dynamic";

function faviconUrl(domain: string, size: number = 24) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

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
  let points: UsagePoint[] = [];
  let topDomains: string[] = [];

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

      // Build per-day aggregates for usage%
      const dayKeys: string[] = [];
      const startMs = new Date(new Date().toISOString().slice(0, 10)).getTime() - (days - 1) * 86400000;
      for (let i = 0; i < days; i++) {
        const d = new Date(startMs + i * 86400000);
        dayKeys.push(d.toISOString().slice(0, 10));
      }
      const byDay = new Map<string, { total: number; domainChats: Map<string, number> }>();
      dayKeys.forEach((k) => byDay.set(k, { total: 0, domainChats: new Map() }));

      for (const run of runs) {
        const citations = run.answer?.citations ?? [];
        if (!citations.length) continue;
        const domainsInThisRun = new Map<string, number>();
        for (const c of citations) {
          const count = domainsInThisRun.get(c.domain) || 0;
          domainsInThisRun.set(c.domain, count + 1);
        }
        // per-domain overall usage + per-day usage
        const dayKey = new Date(run.finishedAt!).toISOString().slice(0, 10);
        const day = byDay.get(dayKey) || { total: 0, domainChats: new Map() };
        day.total += 1;
        for (const [domain, count] of domainsInThisRun.entries()) {
          const agg = domainToUsage.get(domain) || { chats: 0, totalCitations: 0 };
          agg.chats += 1;
          agg.totalCitations += count;
          domainToUsage.set(domain, agg);
          day.domainChats.set(domain, (day.domainChats.get(domain) || 0) + 1);
        }
        byDay.set(dayKey, day);
      }

      rows = Array.from(domainToUsage.entries())
        .map(([domain, agg]) => ({
          domain,
          usedPct: agg.chats / totalRuns,
          avgCitations: agg.totalCitations / Math.max(1, agg.chats),
          type: classifyDomain(domain),
        }))
        .sort((a, b) => b.usedPct - a.usedPct);

      topDomains = rows.slice(0, 5).map((r) => r.domain);

      // Build chart points: usage% per day per top domain
      points = dayKeys.map((k) => {
        const d = byDay.get(k) || { total: 0, domainChats: new Map<string, number>() };
        const obj: UsagePoint = { date: k };
        for (const domain of topDomains) {
          const denom = d.total || 0;
          const num = d.domainChats.get(domain) || 0;
          const pct = denom > 0 ? (num / denom) * 100 : 0;
          obj[domain] = Math.round(pct);
        }
        return obj;
      });
    }
  } catch {
    rows = [];
    points = [];
    topDomains = [];
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

      {topDomains.length > 0 && points.length > 0 ? (
        <SourceUsageChart points={points} domains={topDomains} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-600">No chart data yet.</div>
      )}

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
            {rows.slice(0, 100).map((r) => (
              <tr key={r.domain} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={faviconUrl(r.domain, 24)}
                      width={16}
                      height={16}
                      alt=""
                      className="h-4 w-4 rounded"
                      loading="lazy"
                    />
                    <span>{r.domain}</span>
                  </div>
                </td>
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