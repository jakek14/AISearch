import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");
    const provider = searchParams.get("provider");
    if (!promptId) return NextResponse.json({ error: "Missing promptId" }, { status: 400 });

    const latestRun = await prisma.providerRun.findFirst({
      where: { promptId, ...(provider ? { provider } : {}), status: { in: ["succeeded", "completed", "ok"] } },
      orderBy: { finishedAt: "desc" },
    });
    if (!latestRun) return NextResponse.json({ answer: null, citations: [] });

    const answer = await prisma.answer.findUnique({ where: { providerRunId: latestRun.id } });
    if (!answer) return NextResponse.json({ answer: null, citations: [] });

    const citations = await prisma.citation.findMany({ where: { answerId: answer.id }, orderBy: { rankHint: "desc" } });
    return NextResponse.json({ run: latestRun, answer, citations });
  } catch (e) {
    const message = (e as Error)?.message || "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 