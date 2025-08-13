export const dynamic = "force-dynamic";
import KPICards from "@/app/(dashboard)/components/KPICards";
import VisibilityChart from "@/app/(dashboard)/components/VisibilityChart";
import TopSources from "@/app/(dashboard)/components/TopSources";
import UnderperformingPrompts from "@/app/(dashboard)/components/UnderperformingPrompts";
import Toolbar from "@/app/(dashboard)/components/Toolbar";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";

type ProviderKey = "openai" | "anthropic" | "gemini";

async function getVisibilityPoints(brandId: string, provider?: string, days: number = 30) {
	try {
		const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		const rows = await prisma.visibilitySnapshot.findMany({
			where: { brandId, date: { gte: since } },
			orderBy: { date: "asc" },
		});
		const byDay = new Map<string, { date: string; openai?: number; anthropic?: number; gemini?: number }>();
		for (const r of rows) {
			if (provider && r.provider !== provider) continue;
			const key = r.date.toISOString().slice(0, 10);
			const entry = byDay.get(key) || { date: key };
			const p = r.provider as ProviderKey;
			(entry[p] as number | undefined) = r.visibilityPct;
			byDay.set(key, entry);
		}
		return Array.from(byDay.values());
	} catch {
		return [] as { date: string; openai?: number; anthropic?: number; gemini?: number }[];
	}
}

async function safeGetOrgAndBrands() {
	try {
		const org = await prisma.org.findFirst();
		if (!org) return { org: null as unknown as { id: string } | null, brands: [] as { id: string; name: string }[] };
		const brands = await prisma.brand.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
		return { org, brands };
	} catch {
		return { org: null as unknown as { id: string } | null, brands: [] as { id: string; name: string }[] };
	}
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
	const sp = await searchParams;
	if (process.env.NODE_ENV !== "production") {
		try {
			await ensureDemoData();
		} catch {
			// ignore seed failures locally
		}
	}

	const { org, brands } = await safeGetOrgAndBrands();
	const activeBrandId = sp.brandId || brands[0]?.id;
	const days = Number(sp.days || "30");
	const provider = sp.provider && sp.provider !== "all" ? sp.provider : undefined;

	const points = activeBrandId ? await getVisibilityPoints(activeBrandId, provider, days) : [];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Dashboard</h1>
			</div>
			<Toolbar brands={brands} />
			{org ? <KPICards orgId={org.id} /> : null}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<div className="mb-2 text-sm text-gray-500">Visibility % by provider (last {days}d)</div>
					<div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
						<VisibilityChart points={points} />
					</div>
				</div>
				{activeBrandId ? <TopSources brandId={activeBrandId} provider={provider} days={days} /> : null}
			</div>
			{org ? <UnderperformingPrompts orgId={org.id} provider={provider} days={days} /> : null}
		</div>
	);
} 