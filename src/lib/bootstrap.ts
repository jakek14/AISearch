import { prisma } from "./prisma";

export async function ensureBaseOrg(): Promise<{ id: string }> {
	let org = await prisma.org.findFirst();
	if (!org) {
		org = await prisma.org.create({ data: { name: "Your Org" } });
	}
	return { id: org.id };
} 