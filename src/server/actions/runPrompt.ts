"use server";
import { prisma } from "@/lib/prisma";
import { providerRunners, estimateCostUsd, type ProviderName } from "@/lib/providers";
import { Prisma } from "@prisma/client";
import { citationsFromText } from "@/lib/citations";
import { findMentions } from "@/lib/entities";

export async function runPromptAction(params: { promptId: string; provider: ProviderName }) {
  const { promptId, provider } = params;

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error("Prompt not found");

  const startedAt = new Date();
  const run = await prisma.providerRun.create({
    data: {
      promptId,
      provider,
      model: "auto",
      status: "running",
      startedAt,
    },
  });

  try {
    const runner = providerRunners[provider];
    if (!runner) throw new Error(`Unsupported provider: ${provider}`);

    const result = await runner(prompt.text);

    const costUsd = estimateCostUsd(provider, result.tokensIn, result.tokensOut);

    const saved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedRun = await tx.providerRun.update({
        where: { id: run.id },
        data: {
          status: "succeeded",
          finishedAt: new Date(),
          tokensIn: result.tokensIn ?? null,
          tokensOut: result.tokensOut ?? null,
          costUsd,
        },
      });

      const answer = await tx.answer.create({
        data: {
          providerRunId: run.id,
          text: result.text,
          language: "en",
        },
      });

      let citationsToSave = result.citations ?? [];
      if (!citationsToSave.length) {
        citationsToSave = citationsFromText(result.text);
      }
      // Top-up citations from answer text to ensure we capture up to 5 unique domains
      if (citationsToSave.length < 5) {
        const parsedFromText = citationsFromText(result.text);
        const seenDomains = new Set<string>(citationsToSave.map((c) => c.domain));
        for (const c of parsedFromText) {
          if (!c.domain || seenDomains.has(c.domain)) continue;
          seenDomains.add(c.domain);
          citationsToSave.push({ ...c, rankHint: citationsToSave.length + 1 });
          if (citationsToSave.length >= 5) break;
        }
      }

      if (citationsToSave.length) {
        await tx.citation.createMany({
          data: citationsToSave.map((c) => ({
            answerId: answer.id,
            url: c.url,
            domain: c.domain,
            title: c.title ?? null,
            rankHint: c.rankHint ?? null,
          })),
        });
      }

      // Entity linker: create Mention rows for the owner brand
      const ownerBrand = await tx.brand.findFirst({ where: { orgId: prompt.orgId } });
      if (ownerBrand) {
        const found = findMentions(result.text, ownerBrand);
        if (found.length) {
          await tx.mention.createMany({
            data: found.map((m) => ({
              answerId: answer.id,
              brandId: ownerBrand.id,
              confidence: m.confidence,
              excerptStart: m.start,
              excerptEnd: m.end,
            })),
          });
        }
      }

      return { run: updatedRun, answer };
    });

    return saved;
  } catch (err) {
    await prisma.providerRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date() },
    });
    const msg = (err as Error)?.message || "Unknown error";
    if (msg.includes("Missing OPENAI_API_KEY") || msg.includes("Missing ANTHROPIC_API_KEY") || msg.includes("Missing GOOGLE_API_KEY")) {
      throw new Error(`${provider} not configured: ${msg}`);
    }
    throw err;
  }
} 