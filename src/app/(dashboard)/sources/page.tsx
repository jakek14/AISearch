import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SourceAggRow = { id: string; brandId: string; provider: string; domain: string; citations: number };

type SourceAggClient = { findMany: (args: unknown) => Promise<unknown[]> };

export default async function SourcesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sp = await searchParams;
  const provider = sp.provider || "openai";
  const brandName = sp.brand;
  const brand = brandName ? await prisma.brand.findFirst({ where: { name: brandName } }) : await prisma.brand.findFirst();
  const where: Partial<{ provider: string; brandId: string }> = { provider, ...(brand ? { brandId: brand.id } : {}) };

  const client = (prisma as unknown as { sourceAgg: SourceAggClient }).sourceAgg;
  const rows = (await client.findMany({ where, orderBy: { citations: "desc" }, take: 100 })) as SourceAggRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <form className="flex items-center gap-2">
        <select name="provider" defaultValue={provider} className="rounded border px-2 py-1">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Claude</option>
          <option value="gemini">Gemini</option>
        </select>
        <input name="brand" placeholder="brand" defaultValue={brandName} className="rounded border px-2 py-1" />
        <button className="rounded bg-black px-3 py-1 text-white">Filter</button>
      </form>
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2">Domain</th>
            <th>Citations</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">{r.domain}</td>
              <td>{r.citations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 