import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const brand = await prisma.brand.findFirst();
  const count = brand ? await prisma.competitor.count({ where: { brandId: brand.id } }) : 0;
  return NextResponse.json({ count });
} 