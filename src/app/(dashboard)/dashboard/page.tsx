export const dynamic = "force-dynamic";
import KPICards from "@/app/(dashboard)/components/KPICards";
import VisibilityChart from "@/app/(dashboard)/components/VisibilityChart";
import TopSources from "@/app/(dashboard)/components/TopSources";
import UnderperformingPrompts from "@/app/(dashboard)/components/UnderperformingPrompts";
import Toolbar from "@/app/(dashboard)/components/Toolbar";
import { prisma } from "@/lib/prisma";
import { ensureBaseOrg } from "@/lib/bootstrap";

function dateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

async function getMultiBrandVisibility(orgId: string, days: number, provider?: string) {
	const until = new Date();
	const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
	const brand = await prisma.brand.findFirst({ where: { orgId }, include: { competitors: true } });
	const brands = await prisma.brand.findMany({ where: { orgId }, select: { id: true, name: true } });

	// Series: prefer real brands if present; otherwise, fallback to single brand + competitors
	const brandColors = ["#3b82f6", "#6b7280", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
	let series: { key: string; name: string; color: string }[] = [];
	if (brands.length > 0) {
		series = brands.map((b, i) => ({ key: b.id, name: b.name, color: brandColors[i % brandColors.length] }));
	} else if (brand) {
		series = [{ key: brand.id, name: brand.name, color: brandColors[0] }];
		brand.competitors.forEach((c, idx) => {
			series.push({ key: `competitor:${c.id}`, name: c.name, color: brandColors[(idx + 1) % brandColors.length] });
		});
	}

	// Build zero-filled points per day so the chart always renders
	const pointsMap = new Map<string, Record<string, number | string>>();
	for (let t = since.getTime(); t <= until.getTime(); t += 24 * 60 * 60 * 1000) {
		const d = new Date(t);
		const key = dateKey(d);
		const base: Record<string, number | string> = { date: key };
		for (const s of series) base[s.key] = 0;
		pointsMap.set(key, base);
	}

	// Overlay actual visibility snapshots for real brands
	if (series.length > 0) {
		const realBrandIds = series.filter((s) => !s.key.startsWith("competitor:")).map((s) => s.key);
		if (realBrandIds.length > 0) {
			const rows = await prisma.visibilitySnapshot.findMany({
				where: { brandId: { in: realBrandIds }, date: { gte: since, lte: until }, provider: provider ? provider : undefined },
				orderBy: { date: "asc" },
			});
			for (const r of rows) {
				const key = dateKey(r.date);
				const entry = pointsMap.get(key);
				if (entry) entry[r.brandId] = r.visibilityPct;
			}
		}
	}

	return { points: Array.from(pointsMap.values()), series };
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
					{brands[0] ? <TopSources brandId={brands[0].id} provider={provider} days={days} /> : null}
					{org ? <UnderperformingPrompts orgId={org.id} provider={provider} days={days} /> : null}
				</div>
			</div>
		</div>
	);
} 