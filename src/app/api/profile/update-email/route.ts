import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const { email, accessToken } = await req.json().catch(() => ({} as any));
		if (!email || !accessToken) {
			return NextResponse.json({ error: "Missing email or accessToken" }, { status: 400 });
		}

		const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
		if (!url || !serviceKey) {
			return NextResponse.json({ error: "Server not configured" }, { status: 500 });
		}

		const admin = createClient(url, serviceKey);

		// Verify token and get user id
		const userRes = await admin.auth.getUser(accessToken);
		if (userRes.error || !userRes.data.user?.id) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		const userId = userRes.data.user.id;
		const upd = await admin.auth.admin.updateUserById(userId, { email });
		if (upd.error) {
			return NextResponse.json({ error: upd.error.message }, { status: 400 });
		}

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = (e as Error)?.message || "Internal error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
} 