import { prisma } from "@/lib/prisma";
import AnswerDrawerMount from "./components/AnswerDrawerMount";
import RunControls from "./components/RunControls";
import type { Prisma } from "@prisma/client";
import { computeMentionPosition } from "@/lib/position";
import { revalidatePath } from "next/cache";
import PromptDeleteDialog from "./components/PromptDeleteDialog";
import { ensureBaseOrg } from "@/lib/bootstrap";
import { computeBrandSentimentScore } from "@/lib/sentiment";

function faviconUrl(domain: string, size: number = 24) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function flagForLocale(locale: string): { flag: string; region: string } {
  if (!locale) return { flag: "", region: "" };
  const region = (locale.split("-")[1] || "US").toUpperCase();
  // simple US-only fallback
  const flag = region === "US" ? "🇺🇸" : "🏳️";
  return { flag, region };
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min. ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hr. ago`;
  const days = Math.floor(hours / 24);
  return `${days} d. ago`;
}

async function getData(orgId: string, filters: { topic?: string; provider?: string; hasMentions?: string; from?: string; to?: string }) {
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  const competitors = await prisma.competitor.findMany({ where: { brandId: brand?.id || "" } });

  const wherePrompt: Prisma.PromptWhereInput = { orgId };
  if (filters.topic) wherePrompt.topic = filters.topic;
  const prompts = await prisma.prompt.findMany({ where: wherePrompt, orderBy: { createdAt: "desc" } });
  const promptIds = prompts.map((p) => p.id);

  const whereRun: Prisma.ProviderRunWhereInput = { promptId: { in: promptIds } };
  if (filters.provider) whereRun.provider = filters.provider;
  if (filters.from || filters.to) {
    whereRun.finishedAt = {};
    if (filters.from) whereRun.finishedAt.gte = new Date(filters.from);
    if (filters.to) whereRun.finishedAt.lte = new Date(filters.to);
  }

  const runs = await prisma.providerRun.findMany({
    where: whereRun,
    orderBy: { finishedAt: "desc" },
    include: { answer: { include: { citations: true, mentions: true } } },
  });

  // Map by promptId
  const byPrompt = new Map<string, typeof runs[number][]>();
  for (const r of runs) {
    if (!byPrompt.has(r.promptId)) byPrompt.set(r.promptId, []);
    byPrompt.get(r.promptId)!.push(r);
  }

  let rows = prompts.map((p) => {
    const list = byPrompt.get(p.id) || [];
    const latest = list[0];
    const latestAnswer = latest?.answer;

    // Visibility (%): share of answers (under current filters) that include your brand name OR cite one of your domains
    const denom = list.length;
    let visibleCount = 0;
    if (brand) {
      for (const r of list) {
        const mentioned = r.answer?.mentions?.some((m) => m.brandId === brand.id) ?? false;
        const cited = (r.answer?.citations || []).some((c) => brand.domains.includes(c.domain));
        if (mentioned || cited) visibleCount += 1;
      }
    }
    const visibilityPct = denom > 0 ? (visibleCount / denom) * 100 : 0;

    // Rank: average earliest position across answers where brand appeared
    let rank: number | null = null;
    if (brand && list.length > 0) {
      const competitorNames = competitors.map((c) => c.name);
      const positions: number[] = [];
      for (const r of list) {
        const text = r.answer?.text || "";
        // Skip answers without mentions of brand
        const mentioned = r.answer?.mentions?.some((m) => m.brandId === brand.id) ?? false;
        const cited = (r.answer?.citations || []).some((c) => brand.domains.includes(c.domain));
        if (!mentioned && !cited) continue;
        const pos = computeMentionPosition(text, [brand.name, ...competitorNames]);
        if (pos != null) positions.push(pos);
      }
      if (positions.length > 0) {
        const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
        rank = Math.round(avg * 10) / 10; // one decimal place
      }
    }

    // Sentiment 0–100: average of per-answer brand-specific scores across answers where the brand appeared
    let sentiment: number | null = null;
    if (brand && list.length > 0) {
      const scores: number[] = [];
      for (const r of list) {
        const mentioned = r.answer?.mentions?.some((m) => m.brandId === brand.id) ?? false;
        const cited = (r.answer?.citations || []).some((c) => brand.domains.includes(c.domain));
        if (!mentioned && !cited) continue; // only answers that include your brand
        const score = computeBrandSentimentScore(r.answer?.text || "", brand);
        if (score != null) scores.push(score);
      }
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        sentiment = Math.round(avg);
      }
    }

    // Build Top: order by earliest appearance in latest answer, include max 3, use favicons
    const tops: { key: string; type: "brand" | "competitor"; domain: string }[] = [];
    if (latestAnswer) {
      const lower = latestAnswer.text.toLowerCase();
      const entries: { key: string; type: "brand" | "competitor"; domain: string; pos: number }[] = [];
      if (brand) {
        const pos = lower.indexOf(brand.name.toLowerCase());
        if (pos >= 0) entries.push({ key: `brand-${brand.id}`, type: "brand", domain: brand.domains[0] || "", pos });
      }
      for (const c of competitors) {
        const pos = lower.indexOf(c.name.toLowerCase());
        if (pos >= 0) entries.push({ key: c.id, type: "competitor", domain: c.domains[0] || "", pos });
      }
      entries.sort((a, b) => a.pos - b.pos);
      for (const e of entries.slice(0, 3)) {
        tops.push({ key: e.key, type: e.type, domain: e.domain });
      }
    }

    return {
      prompt: p,
      rank,
      sentiment,
      visibilityPct,
      tops,
    };
  });

  if (filters.hasMentions === "you") rows = rows.filter((r) => Math.round(r.visibilityPct) === 100);
  if (filters.hasMentions === "competitors") rows = rows.filter((r) => r.tops.some((t) => t.type === "competitor"));

  return rows;
}

async function getOrgIdSafe(): Promise<string | null> {
  try {
    const org = await prisma.org.findFirst();
    if (org) return org.id;
    const created = await ensureBaseOrg();
    return created.id;
  } catch {
    return null;
  }
}

export default async function PromptsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const orgId = await getOrgIdSafe();

  async function createPrompt(formData: FormData) {
    "use server";
    const text = String(formData.get("text") || "").trim();
    const topic = String(formData.get("topic") || "").trim() || "general";
    if (!text || !orgId) return;
    await prisma.prompt.create({ data: { orgId, text, topic } });
    revalidatePath("/prompts");
  }

  async function deletePrompt(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "").trim();
    if (!id) return;
    const runs = await prisma.providerRun.findMany({ where: { promptId: id }, select: { id: true } });
    const runIds = runs.map((r) => r.id);
    if (runIds.length > 0) {
      const answers = await prisma.answer.findMany({ where: { providerRunId: { in: runIds } }, select: { id: true } });
      const answerIds = answers.map((a) => a.id);
      if (answerIds.length > 0) {
        await prisma.citation.deleteMany({ where: { answerId: { in: answerIds } } });
        await prisma.mention.deleteMany({ where: { answerId: { in: answerIds } } });
      }
      await prisma.answer.deleteMany({ where: { providerRunId: { in: runIds } } });
    }
    await prisma.providerRun.deleteMany({ where: { promptId: id } });
    await prisma.prompt.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/prompts");
    revalidatePath("/sources");
    revalidatePath("/opportunities");
  }

  let rows: Awaited<ReturnType<typeof getData>> = [];
  if (orgId) {
    try {
      rows = await getData(orgId, {
        topic: sp.topic,
        provider: sp.provider,
        hasMentions: sp.hasMentions,
        from: sp.from,
        to: sp.to,
      });
    } catch {
      rows = [];
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Prompts</h1>

      {orgId ? null : (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Database not available or no organization found. Configure your database and reload.
        </div>
      )}

      <form action={createPrompt} className="rounded border bg-white p-4 space-y-2">
        <div>
          <label className="block text-sm font-medium">Prompt text</label>
          <textarea name="text" className="mt-1 w-full rounded border p-2" rows={3} placeholder="e.g., best X tools"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium">Topic</label>
          <input name="topic" className="mt-1 w-full rounded border p-2" placeholder="e.g., project-management" />
        </div>
        <button className="rounded bg-black px-4 py-2 text-white" disabled={!orgId}>Add Prompt</button>
      </form>

      <form className="grid grid-cols-1 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input name="topic" placeholder="Topic" defaultValue={sp.topic || ""} className="rounded border px-2 py-1" />
        <select name="provider" defaultValue={sp.provider || ""} className="rounded border px-2 py-1">
          <option value="">All providers</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
        </select>
        <select name="hasMentions" defaultValue={sp.hasMentions || ""} className="rounded border px-2 py-1">
          <option value="">Mentions: Any</option>
          <option value="you">You mentioned</option>
          <option value="competitors">Competitors mentioned</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from || ""} className="rounded border px-2 py-1" />
        <input type="date" name="to" defaultValue={sp.to || ""} className="rounded border px-2 py-1" />
        <button className="rounded bg-black px-3 py-1 text-white">Filter</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-700">
            <tr>
              <th className="p-2 w-8">
                <input type="checkbox" aria-label="Select all" />
              </th>
              <th className="p-2 font-medium">Prompt</th>
              <th className="p-2 font-medium">Rank</th>
              <th className="p-2 font-medium">Sentiment</th>
              <th className="p-2 font-medium">Visibility</th>
              <th className="p-2 font-medium">Top</th>
              <th className="p-2 font-medium">Tags</th>
              <th className="p-2 font-medium">Location</th>
              <th className="p-2 font-medium">Created</th>
              <th className="p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const loc = flagForLocale(r.prompt.locale || "en-US");
              return (
                <tr key={r.prompt.id} className="border-t align-top">
                  <td className="p-2 w-8">
                    <PromptDeleteDialog id={r.prompt.id} text={r.prompt.text} onDelete={deletePrompt} checkboxTrigger />
                  </td>
                  <td className="p-2 max-w-xl">
                    <a
                      href={`?view=${encodeURIComponent(r.prompt.id)}`}
                      className="text-gray-900 underline underline-offset-2"
                    >
                      {r.prompt.text}
                    </a>
                  </td>
                  <td className="p-2 tabular-nums">{r.rank != null ? r.rank.toFixed(1) : "—"}</td>
                  <td className="p-2 tabular-nums">{r.sentiment != null ? r.sentiment : "—"}</td>
                  <td className="p-2 tabular-nums">{Math.round(r.visibilityPct)}%</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.tops.map((t) => (
                        <img
                          key={t.key}
                          src={t.domain ? faviconUrl(t.domain, 32) : "/favicon.ico"}
                          width={24}
                          height={24}
                          alt=""
                          title={t.type === "brand" ? "Your brand" : "Competitor"}
                          className={
                            t.type === "brand"
                              ? "h-6 w-6 rounded ring-2 ring-black"
                              : "h-6 w-6 rounded border border-gray-200"
                          }
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{loc.flag}</span>
                      <span className="text-xs text-gray-600">{loc.region}</span>
                    </div>
                  </td>
                  <td className="p-2 text-gray-600">{timeAgo(r.prompt.createdAt)}</td>
                  <td className="p-2">
                    <RunControls promptId={r.prompt.id} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-600">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-center border-t bg-white p-3">
          <button className="inline-flex items-center gap-2 rounded border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50" disabled>
            <span className="text-lg leading-none">⬇️</span>
            <span>Download</span>
          </button>
        </div>
      </div>

      <AnswerDrawerMount id={typeof (sp.view || "") === "string" ? (sp.view as string) : ""} />
    </div>
  );
} 