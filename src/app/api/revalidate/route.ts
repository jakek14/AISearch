import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ revalidated: true, now: Date.now() });
} 