export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";

function formatDate(d?: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "—";
}

async function getOpportunities(orgId: string, filters: { status?: string }) {
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  if (!brand) return [] as any[];
  const where: any = { brandId: brand.id };
  if (filters.status) where.status = filters.status;
  const rows = await prisma.opportunity.findMany({ where, orderBy: { priorityScore: "desc" } });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const withFreq = await Promise.all(
    rows.map(async (r) => {
      const freq = await prisma.citation.count({
        where: {
          domain: r.domain,
          answer: { run: { prompt: { orgId }, finishedAt: { gte: since } } },
        },
      });
      return { ...r, citedFreq30d: freq } as any;
    })
  );

  return withFreq;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { org } = await ensureDemoData();
  const sp = await searchParams;
  const rows = await getOpportunities(org.id, { status: sp.status });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Opportunities</h1>

      <form className="flex items-center gap-3 rounded border bg-white p-4">
        <select name="status" defaultValue={sp.status || ""} className="rounded border px-2 py-1">
          <option value="">All status</option>
          <option value="new">New</option>
          <option value="in-progress">In progress</option>
          <option value="ignored">Ignored</option>
        </select>
        <button className="rounded bg-black px-3 py-1 text-white">Filter</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2 font-medium">Domain</th>
              <th className="p-2 font-medium">Cited freq (30d)</th>
              <th className="p-2 font-medium">Competitors cited</th>
              <th className="p-2 font-medium">Priority</th>
              <th className="p-2 font-medium">Last seen</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.domain}</td>
                <td className="p-2">{r.citedFreq30d}</td>
                <td className="p-2">{r.competitorsCited.join(", ") || "—"}</td>
                <td className="p-2">{r.priorityScore.toFixed(2)}</td>
                <td className="p-2">{formatDate(r.lastSeen)}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  <button className="rounded border px-2 py-1">Generate outreach brief</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-600">
                  No opportunities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 