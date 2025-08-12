import { prisma } from "@/lib/prisma";
import AnswerDrawerMount from "./components/AnswerDrawerMount";
import { ensureDemoData } from "@/lib/demo";
import RunControls from "./components/RunControls";
import type { Prisma } from "@prisma/client";
import { computeMentionPosition } from "@/lib/position";
import { revalidatePath } from "next/cache";

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{children}</span>;
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
  const competitorDomains = new Set<string>(competitors.flatMap((c) => c.domains));
  const competitorNames = new Set<string>(competitors.map((c) => c.name.toLowerCase()));

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
    const youMentioned = list.some((r) => r.answer?.mentions?.some((m) => m.brandId === brand?.id));
    const competitorsMentioned = list.some((r) => r.answer?.citations?.some((c) => competitorDomains.has(c.domain)));
    const visibilityPct = youMentioned ? 100 : 0;
    // Position heuristic for your brand in latest answer
    const position = latestAnswer && brand ? computeMentionPosition(latestAnswer.text, [brand.name, ...competitors.map((c) => c.name)]) : null;
    // Top chips: include your brand (A) if mentioned and any competitors whose names appear
    const tops: { key: string; label: string; type: "brand" | "competitor" }[] = [];
    if (latestAnswer) {
      const lower = latestAnswer.text.toLowerCase();
      if (brand && lower.includes(brand.name.toLowerCase())) tops.push({ key: `brand-${brand.id}`, label: brand.name[0] || "A", type: "brand" });
      for (const c of competitors) {
        if (lower.includes(c.name.toLowerCase())) tops.push({ key: c.id, label: c.name[0] || "C", type: "competitor" });
      }
    }
    return {
      prompt: p,
      position,
      sentiment: null as null | "pos" | "neg" | "neu", // placeholder, not computed yet
      visibilityPct,
      tops,
    };
  });

  if (filters.hasMentions === "you") rows = rows.filter((r) => r.visibilityPct === 100);
  if (filters.hasMentions === "competitors") rows = rows.filter((r) => r.tops.some((t) => t.type === "competitor"));

  return rows;
}

async function getOrgIdSafe(): Promise<string | null> {
  try {
    if (process.env.NODE_ENV !== "production") {
      const seeded = await ensureDemoData();
      return seeded.org.id;
    }
    const org = await prisma.org.findFirst();
    return org?.id ?? null;
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
    // Revalidate this page so the new prompt appears without a manual reload
    revalidatePath("/prompts");
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
              <th className="p-2 font-medium">Position</th>
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
                    <input type="checkbox" aria-label="Select row" />
                  </td>
                  <td className="p-2 max-w-xl">
                    <a href={`?view=${r.prompt.id}`} className="text-gray-900 hover:underline">
                      {r.prompt.text}
                    </a>
                  </td>
                  <td className="p-2 tabular-nums">{r.position ?? "—"}</td>
                  <td className="p-2">—</td>
                  <td className="p-2 tabular-nums">{Math.round(r.visibilityPct)}%</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.tops.map((t) => (
                        <span
                          key={t.key}
                          className={
                            t.type === "brand"
                              ? "inline-flex h-6 min-w-6 items-center justify-center rounded bg-black px-1 text-xs font-medium text-white"
                              : "inline-flex h-6 min-w-6 items-center justify-center rounded bg-gray-100 px-1 text-xs font-medium text-gray-700"
                          }
                          title={t.type === "brand" ? "Your brand" : "Competitor"}
                        >
                          {t.label}
                        </span>
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