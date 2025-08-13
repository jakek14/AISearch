import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const auth = req.headers.get("authorization") || "";
		const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
		const expected = process.env.ADMIN_RESET_TOKEN || "";
		if (!expected || token !== expected) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Truncate all app tables; CASCADE handles FK dependencies
		await prisma.$executeRawUnsafe(
			'TRUNCATE "MentionEvent", "Mention", "Citation", "Answer", "ProviderRun", "Opportunity", "SourceAgg", "VisibilitySnapshot", "BrandRankingSnapshot", "Competitor", "Prompt", "Brand", "User", "Team", "Workspace", "Org" RESTART IDENTITY CASCADE'
		);

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = (e as Error)?.message || "Internal error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
} 