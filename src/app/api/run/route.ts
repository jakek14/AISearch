import { NextResponse } from "next/server";
import { runPromptAction } from "@/server/actions/runPrompt";
import type { ProviderName } from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { recomputeVisibilitySnapshots } from "@/server/jobs/recomputeVisibility";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");
    const provider = searchParams.get("provider") as ProviderName | null;
    if (!promptId || !provider) {
      return NextResponse.json({ error: "Missing promptId or provider" }, { status: 400 });
    }

    const { run, answer } = await runPromptAction({ promptId, provider });
    const citations = await prisma.citation.findMany({ where: { answerId: answer.id } });

    // Update visibility snapshots so the dashboard chart reflects the new run
    await recomputeVisibilitySnapshots();
    revalidatePath("/dashboard");

    return NextResponse.json({ run, answer, citations });
  } catch (err) {
    const message = (err as Error)?.message || "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 