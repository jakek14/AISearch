import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");
    if (!promptId) return NextResponse.json({ error: "Missing promptId" }, { status: 400 });

    const providers = ["openai", "anthropic", "gemini"] as const;
    type ProviderKey = (typeof providers)[number];
    type ProviderRunResp = {
      run: { id: string; provider: string; finishedAt: Date | string | null } | null;
      answer: { id: string; text: string } | null;
      citations: { id: string; url: string; domain: string; title?: string | null; rankHint?: number | null }[];
    };

    const result: Partial<Record<ProviderKey, ProviderRunResp>> = {};

    for (const p of providers) {
      const run = await prisma.providerRun.findFirst({
        where: { promptId, provider: p, status: { in: ["succeeded", "completed", "ok"] } },
        orderBy: { finishedAt: "desc" },
      });
      if (!run) {
        result[p] = { run: null, answer: null, citations: [] };
        continue;
      }
      const answer = await prisma.answer.findUnique({ where: { providerRunId: run.id } });
      const citations = answer
        ? await prisma.citation.findMany({ where: { answerId: answer.id }, orderBy: { rankHint: "desc" } })
        : [];
      result[p] = { run, answer, citations };
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = (e as Error)?.message || "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 