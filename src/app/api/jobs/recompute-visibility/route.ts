import { NextResponse } from "next/server";
import { recomputeVisibilitySnapshots } from "@/server/jobs/recomputeVisibility";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const { updated } = await recomputeVisibilitySnapshots();
  return NextResponse.json({ ok: true, updated });
} 