export const dynamic = "force-dynamic";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import KPICards from "./components/KPICards";
import VisibilityChart from "./components/VisibilityChart";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";

async function getVisibilityPoints(orgId: string) {
  // Choose first brand
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  if (!brand) return [] as { date: string; openai?: number; anthropic?: number; gemini?: number }[];
  const rows = await prisma.visibilitySnapshot.findMany({
    where: { brandId: brand.id },
    orderBy: { date: "asc" },
  });
  const byDay = new Map<string, { date: string; openai?: number; anthropic?: number; gemini?: number }>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const entry = byDay.get(key) || { date: key };
    (entry as any)[r.provider as "openai" | "anthropic" | "gemini"] = r.visibilityPct;
    byDay.set(key, entry);
  }
  return Array.from(byDay.values());
}

export default async function OverviewPage() {
  const { org } = await ensureDemoData();
  const points = await getVisibilityPoints(org.id);

  return (
    <div className="space-y-6">
      <SignedOut>
        <div className="mx-auto max-w-md rounded border bg-white p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold">Welcome</h1>
          <p className="mb-4 text-sm text-gray-600">Sign in to access your dashboard.</p>
          <SignInButton mode="modal">
            <button className="rounded bg-black px-4 py-2 text-white">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <KPICards orgId={org.id} />
        <div>
          <div className="mb-2 text-sm text-gray-500">Visibility % by provider (last 30d)</div>
          <VisibilityChart points={points} />
        </div>
      </SignedIn>
    </div>
  );
} 