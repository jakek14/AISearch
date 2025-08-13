import { prisma } from "./prisma";

export async function getActiveUserId(): Promise<string> {
	// TODO: Integrate real auth here (Clerk, etc). Fallback to a stable demo user.
	return "demo-user";
}

export async function getOrCreateUserAndOrg(): Promise<{ userId: string; orgId: string }> {
	const userId = await getActiveUserId();
	let user = await prisma.user.findUnique({ where: { id: userId } });
	if (user) return { userId, orgId: user.orgId };
	// Create a dedicated org for this single user
	const org = await prisma.org.create({ data: { name: `User Org (${userId.slice(0, 6)})` } });
	user = await prisma.user.create({ data: { id: userId, orgId: org.id, email: `${userId}@local` } });
	return { userId, orgId: user.orgId };
} 