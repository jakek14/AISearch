import { NextResponse } from "next/server";
import { providerRunners } from "@/lib/providers";
import type { ProviderName } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as ProviderName | null;
    const promptText = searchParams.get("promptText");
    if (!provider || !promptText) {
      return NextResponse.json({ error: "Missing provider or promptText" }, { status: 400 });
    }
    const runner = providerRunners[provider];
    if (!runner) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });

    const result = await runner(promptText);
    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error)?.message || "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 