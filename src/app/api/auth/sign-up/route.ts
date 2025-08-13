import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SignUpPayload = { email: string; password: string };

export async function POST(req: Request) {
	try {
		const body = (await req.json().catch(() => null)) as unknown;
		if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		const { email, password } = body as Partial<SignUpPayload>;
		if (!email || !password) return NextResponse.json({ error: "Missing email or password" }, { status: 400 });

		const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
		if (!url || !serviceKey) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

		const admin = createClient(url, serviceKey);
		const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
		if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = (e as Error)?.message || "Internal error";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
} 