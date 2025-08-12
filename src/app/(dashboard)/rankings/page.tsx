import { prisma } from "@/lib/prisma";

type RankingSnapshotRow = {
  id: string;
  brandId: string;
  topic: string;
  provider: string;
  visibilityPct: number;
  rank: number;
  prevRank: number | null;
  date: Date;
};

export const dynamic = "force-dynamic";

export default async function RankingsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sp = await searchParams;
  const provider = sp.provider || "openai";
  const topic = sp.topic;
  const where: Partial<{ provider: string; topic: string }> = { provider };
  if (topic) where.topic = topic;

  type BrandRankingSnapshotClient = { findMany: (args: unknown) => Promise<unknown[]> };
  const brs = (prisma as unknown as { brandRankingSnapshot: BrandRankingSnapshotClient }).brandRankingSnapshot;
  const rows = (await brs.findMany({
    where,
    orderBy: [{ date: "desc" }, { rank: "asc" }],
    take: 100,
  })) as RankingSnapshotRow[];

  const brandMap = new Map((await prisma.brand.findMany()).map((b) => [b.id, b.name]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rankings</h1>
      <form className="flex items-center gap-2">
        <select name="provider" defaultValue={provider} className="rounded border px-2 py-1">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Claude</option>
          <option value="gemini">Gemini</option>
        </select>
        <input name="topic" placeholder="topic" defaultValue={topic} className="rounded border px-2 py-1" />
        <button className="rounded bg-black px-3 py-1 text-white">Filter</button>
      </form>
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2">Brand</th>
            <th>Topic</th>
            <th>Provider</th>
            <th>Visibility %</th>
            <th>Rank</th>
            <th>Prev</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">{brandMap.get(r.brandId) || r.brandId}</td>
              <td>{r.topic}</td>
              <td>{r.provider}</td>
              <td>{r.visibilityPct.toFixed(1)}</td>
              <td>{r.rank}</td>
              <td>{r.prevRank ?? "—"}</td>
              <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 