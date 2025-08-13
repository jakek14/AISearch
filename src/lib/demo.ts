import { prisma } from "./prisma";
import { getOrCreateUserAndOrg } from "./user";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const PROVIDERS = ["openai", "anthropic", "gemini"] as const;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function ensureDemoData() {
  // Disabled seeding: return existing minimal org/brand if present; otherwise, remain blank
  const org = await prisma.org.findFirst();
  if (!org) {
    return { org: null, brand: null } as unknown as { org: { id: string } | null; brand: { id: string } | null };
  }
  const brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
  return { org, brand } as { org: { id: string } | null; brand: { id: string } | null };
} 