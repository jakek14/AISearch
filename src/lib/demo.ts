import { prisma } from "./prisma";

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
  // Org
  let org = await prisma.org.findFirst({ where: { name: "Demo Org" } });
  if (!org) {
    org = await prisma.org.create({ data: { name: "Demo Org" } });
  }

  // Brand
  let brand = await prisma.brand.findFirst({ where: { orgId: org.id } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        orgId: org.id,
        name: "Acme",
        aliases: ["Acme Corp", "Acme Inc"],
        domains: ["acme.com", "blog.acme.com"],
      },
    });
  }

  // Competitors
  const existingCompetitors = await prisma.competitor.findMany({ where: { brandId: brand.id } });
  if (existingCompetitors.length === 0) {
    await prisma.competitor.createMany({
      data: [
        { brandId: brand.id, name: "Contoso", aliases: ["Contoso Ltd"], domains: ["contoso.com"] },
        { brandId: brand.id, name: "Globex", aliases: ["Globex Corp"], domains: ["globex.com"] },
      ],
    });
  }

  // Prompts
  const existingPrompts = await prisma.prompt.findMany({ where: { orgId: org.id } });
  if (existingPrompts.length === 0) {
    await prisma.prompt.createMany({
      data: [
        { orgId: org.id, text: "What are the best project management tools?", topic: "project-management", locale: "en-US" },
        { orgId: org.id, text: "Top CRM platforms for SMBs", topic: "crm", locale: "en-US" },
        { orgId: org.id, text: "AI platforms comparison", topic: "ai-platforms", locale: "en-US" },
      ],
    });
  }

  // Runs, answers, citations, mentions (if none exist)
  const prompts = await prisma.prompt.findMany({ where: { orgId: org.id } });
  const anyRun = await prisma.providerRun.findFirst({ where: { promptId: { in: prompts.map((p) => p.id) } } });
  if (!anyRun) {
    for (const prompt of prompts) {
      for (const provider of PROVIDERS) {
        const run = await prisma.providerRun.create({
          data: {
            promptId: prompt.id,
            provider,
            model: provider === "openai" ? "gpt-4o-mini" : provider === "anthropic" ? "claude-3-haiku" : "gemini-1.5-pro",
            status: "succeeded",
            startedAt: new Date(),
            finishedAt: new Date(),
            tokensIn: randomInt(50, 200),
            tokensOut: randomInt(200, 500),
            costUsd: Math.random() * 0.05 + 0.01,
          },
        });
        const answer = await prisma.answer.create({
          data: {
            providerRunId: run.id,
            text: `Here is a synthesized answer from ${provider} for: ${prompt.text}. It discusses Acme and sometimes competitors like Contoso or Globex. See sources below.`,
            language: "en",
          },
        });
        const citationsCount = randomInt(2, 5);
        const domains = ["example.com", "news.site", "contoso.com", "globex.com", "acme.com"];
        for (let i = 0; i < citationsCount; i++) {
          const domain = domains[randomInt(0, domains.length - 1)];
          await prisma.citation.create({
            data: {
              answerId: answer.id,
              url: `https://${domain}/article-${randomInt(1, 1000)}`,
              domain,
              title: `Story about ${prompt.topic} #${randomInt(1, 100)}`,
              rankHint: Math.random() * 1.0,
            },
          });
        }
        // Mentions: sometimes brand
        const mentionBrand = Math.random() > 0.3;
        if (mentionBrand) {
          await prisma.mention.create({ data: { answerId: answer.id, brandId: brand.id, confidence: Math.random() } });
        }
      }
    }
  }

  // Visibility snapshots (last 30 days)
  const anySnapshot = await prisma.visibilitySnapshot.findFirst({ where: { brandId: brand.id } });
  if (!anySnapshot) {
    const today = startOfDay(new Date());
    for (let d = 30; d >= 0; d--) {
      const day = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      for (const provider of PROVIDERS) {
        await prisma.visibilitySnapshot.create({
          data: {
            brandId: brand.id,
            topic: "overall",
            provider,
            date: day,
            visibilityPct: Math.max(0, Math.min(100, 40 + Math.sin((d / 30) * Math.PI * 2) * 20 + randomInt(-5, 5))),
          },
        });
      }
    }
  }

  // Opportunities demo
  const anyOpp = await prisma.opportunity.findFirst({ where: { brandId: brand.id } });
  if (!anyOpp) {
    await prisma.opportunity.createMany({
      data: [
        { brandId: brand.id, domain: "news.site", competitorsCited: ["contoso.com"], priorityScore: 0.8, status: "new" },
        { brandId: brand.id, domain: "tech.blog", competitorsCited: ["globex.com"], priorityScore: 0.6, status: "in-progress" },
        { brandId: brand.id, domain: "acme.com", competitorsCited: [], priorityScore: 0.3, status: "ignored" },
      ],
    });
  }

  return { org, brand };
} 