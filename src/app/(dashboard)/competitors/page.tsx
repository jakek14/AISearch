import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function faviconUrl(domain: string, size: number = 24) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function normalizeDomain(input: string): string {
  try {
    let v = input.trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    const u = new URL(v);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return input.trim().toLowerCase();
  }
}

async function getBrandAndCompetitors() {
  try {
    const org = await prisma.org.findFirst();
    if (!org) return { brand: null as { id: string; name: string; domains: string[] } | null, competitors: [] as { id: string; name: string; domains: string[] }[] };
    const brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
    const competitors = brand ? await prisma.competitor.findMany({ where: { brandId: brand.id }, orderBy: { name: "asc" } }) : [];
    return { brand, competitors };
  } catch {
    return { brand: null as { id: string; name: string; domains: string[] } | null, competitors: [] as { id: string; name: string; domains: string[] }[] };
  }
}

async function addCompetitor(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const domainRaw = String(formData.get("domain") || "").trim();
  if (!name || !domainRaw) return;
  const domain = normalizeDomain(domainRaw);
  const brand = await prisma.brand.findFirst();
  if (!brand) return;
  const exists = await prisma.competitor.findFirst({
    where: {
      brandId: brand.id,
      OR: [{ name: { equals: name, mode: "insensitive" } }, { domains: { has: domain } }],
    },
  });
  if (exists) {
    // ensure domain present
    if (!exists.domains.includes(domain)) {
      await prisma.competitor.update({ where: { id: exists.id }, data: { domains: { push: domain } } });
    }
    revalidatePath("/competitors");
    return;
  }
  await prisma.competitor.create({ data: { brandId: brand.id, name, aliases: [], domains: [domain] } });
  revalidatePath("/competitors");
}

async function removeCompetitor(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  try {
    await prisma.competitor.delete({ where: { id } });
  } finally {
    revalidatePath("/competitors");
  }
}

export default async function CompetitorsPage() {
  const { brand, competitors } = await getBrandAndCompetitors();
  if (!brand) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">Database not available or no brand found.</div>
    );
  }
  const all = [
    { id: brand.id, name: brand.name, domains: brand.domains, isBrand: true },
    ...competitors.map((c) => ({ id: c.id, name: c.name, domains: c.domains, isBrand: false })),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Competitors</h1>

      <form action={addCompetitor} className="space-y-3 rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-700">Create Competitor</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input name="name" placeholder="Your brand or competitor name" className="w-full rounded border px-2 py-1" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Domain</label>
            <input name="domain" placeholder="competitor.com" className="w-full rounded border px-2 py-1" required />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="rounded bg-black px-3 py-1.5 text-sm text-white">Add</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/60">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {all.map((item) => {
              const primary = item.domains[0] || "";
              return (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={primary ? faviconUrl(primary, 24) : "/favicon.ico"}
                        width={18}
                        height={18}
                        alt=""
                        className="h-4 w-4 rounded"
                      />
                      <span className="font-medium text-gray-800">{item.name}</span>
                      {item.isBrand ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Your brand</span>
                      ) : null}
                      {primary ? <span className="text-xs text-gray-500">{primary}</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {!item.isBrand ? (
                      <form action={removeCompetitor}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Remove</button>
                      </form>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {all.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-gray-600">No brands/competitors yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 