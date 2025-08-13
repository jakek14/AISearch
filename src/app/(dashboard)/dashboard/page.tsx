export const dynamic = "force-dynamic";
import KPICards from "@/app/(dashboard)/components/KPICards";
import VisibilityChart from "@/app/(dashboard)/components/VisibilityChart";
import TopSources from "@/app/(dashboard)/components/TopSources";
import UnderperformingPrompts from "@/app/(dashboard)/components/UnderperformingPrompts";
import Toolbar from "@/app/(dashboard)/components/Toolbar";
import { prisma } from "@/lib/prisma";
import { ensureBaseOrg } from "@/lib/bootstrap";

async function getMultiBrandVisibility(orgId: string, days: number, provider?: string) {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const brands = await prisma.brand.findMany({ where: { orgId }, select: { id: true, name: true } });
	if (brands.length === 0) return { points: [] as Array<Record<string, number | string>>, series: [] as { key: string; name: string; color: string }[] };
	const brandColors = ["#3b82f6", "#6b7280", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
	const series = brands.map((b, i) => ({ key: b.id, name: b.name, color: brandColors[i % brandColors.length] }));
	const rows = await prisma.visibilitySnapshot.findMany({
		where: { brandId: { in: brands.map((b) => b.id) }, date: { gte: since }, provider: provider ? provider : undefined },
		orderBy: { date: "asc" },
	});
	const byDay = new Map<string, Record<string, number | string>>();
	for (const r of rows) {
		const key = r.date.toISOString().slice(0, 10);
		const entry = byDay.get(key) || { date: key };
		entry[r.brandId] = r.visibilityPct;
		byDay.set(key, entry);
	}
	return { points: Array.from(byDay.values()), series };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
	const sp = await searchParams;
	await ensureBaseOrg();
	const org = await prisma.org.findFirst();
	const days = Number(sp.days || "30");
	const provider = sp.provider && sp.provider !== "all" ? sp.provider : undefined;
	const brands = org ? await prisma.brand.findMany({ where: { orgId: org.id }, select: { id: true, name: true } }) : [];
	const { points, series } = org ? await getMultiBrandVisibility(org.id, days, provider) : { points: [], series: [] };

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Dashboard</h1>
			</div>
			<Toolbar brands={brands} />
			{org ? <KPICards orgId={org.id} /> : null}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<VisibilityChart points={points} series={series} />
				</div>
				<div className="lg:col-span-1 space-y-6">
					{/* TopSources needs an active brand; if user has none yet, this will be empty */}
					{brands[0] ? <TopSources brandId={brands[0].id} provider={provider} days={days} /> : null}
					{org ? <UnderperformingPrompts orgId={org.id} provider={provider} days={days} /> : null}
				</div>
			</div>
		</div>
	);
} 