import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getOrgAndBrand() {
  try {
    const org = await prisma.org.findFirst();
    if (!org) return { org: null as { id: string } | null, brand: null as { id: string; name: string; domains: string[] } | null };
    const brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
    return { org, brand };
  } catch {
    return { org: null as { id: string } | null, brand: null as { id: string; name: string; domains: string[] } | null };
  }
}

async function saveCompany(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const domain = String(formData.get("domain") || "").trim();
  if (!name || !domain) return;
  const org = await prisma.org.findFirst();
  if (!org) return;
  const existing = await prisma.brand.findFirst({ where: { orgId: org.id } });
  if (existing) {
    await prisma.brand.update({ where: { id: existing.id }, data: { name, domains: [domain] } });
  } else {
    await prisma.brand.create({ data: { orgId: org.id, name, domains: [domain] } });
  }
  revalidatePath("/company");
}

export default async function CompanyPage() {
  const { org, brand } = await getOrgAndBrand();
  const name = brand?.name ?? "";
  const domain = brand?.domains?.[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Company</h1>
      </div>

      {!org ? (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Database not available. Once your database is connected, set your company name and domain here.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-700">Edit Company</div>
        <form action={saveCompany} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Name</label>
            <input name="name" defaultValue={name} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Acme" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Domain</label>
            <input name="domain" defaultValue={domain} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="acme.com" />
          </div>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white" disabled={!org}>
            <span className="i-lucide-save" aria-hidden /> Save
          </button>
        </form>
      </div>
    </div>
  );
} 