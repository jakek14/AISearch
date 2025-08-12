import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const brandName = sp.brand;
  const brand = brandName ? await prisma.brand.findFirst({ where: { name: brandName } }) : await prisma.brand.findFirst();
  if (!brand) return <div>No brand found</div>;
  const competitors = await prisma.competitor.findMany({ where: { brandId: brand.id } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Competitors</h1>
      <div className="text-sm text-gray-600">Head-to-head comparisons for {brand.name}</div>
      <ul className="list-inside list-disc text-sm">
        {competitors.map((c) => (
          <li key={c.id}>{c.name} — domains: {c.domains.join(", ")}</li>
        ))}
      </ul>
    </div>
  );
} 