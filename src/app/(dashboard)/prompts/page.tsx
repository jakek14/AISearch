import { prisma } from "@/lib/prisma";
import AnswerDrawerMount from "./components/AnswerDrawerMount";
import { ensureDemoData } from "@/lib/demo";
import RunControls from "./components/RunControls";
import type { Prisma } from "@prisma/client";

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{children}</span>;
}

async function getData(orgId: string, filters: { topic?: string; provider?: string; hasMentions?: string; from?: string; to?: string }) {
  const brand = await prisma.brand.findFirst({ where: { orgId } });
  const competitors = await prisma.competitor.findMany({ where: { brandId: brand?.id || "" } });
  const competitorDomains = new Set<string>(competitors.flatMap((c) => c.domains));

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
    const providers = Array.from(new Set(list.map((r) => r.provider)));
    const youMentioned = list.some((r) => r.answer?.mentions?.some((m) => m.brandId === brand?.id));
    const competitorsMentioned = list.some((r) => r.answer?.citations?.some((c) => competitorDomains.has(c.domain)));
    const citationsCount = list.reduce((acc, r) => acc + (r.answer?.citations?.length || 0), 0);
    return {
      prompt: p,
      providers,
      latestStatus: latest?.status || "—",
      youMentioned,
      competitorsMentioned,
      citationsCount,
    };
  });

  if (filters.hasMentions === "you") rows = rows.filter((r) => r.youMentioned);
  if (filters.hasMentions === "competitors") rows = rows.filter((r) => r.competitorsMentioned);

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
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2 font-medium">Prompt</th>
              <th className="p-2 font-medium">Topic</th>
              <th className="p-2 font-medium">Locale</th>
              <th className="p-2 font-medium">Providers</th>
              <th className="p-2 font-medium">Last status</th>
              <th className="p-2 font-medium">Brand Mentioned?</th>
              <th className="p-2 font-medium">Competitors Mentioned?</th>
              <th className="p-2 font-medium">Citations</th>
              <th className="p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prompt.id} className="border-t align-top">
                <td className="p-2">{r.prompt.text}</td>
                <td className="p-2">{r.prompt.topic}</td>
                <td className="p-2">{r.prompt.locale}</td>
                <td className="p-2 space-x-1">
                  {r.providers.map((p) => (
                    <Badge key={p}>{p}</Badge>
                  ))}
                </td>
                <td className="p-2">{r.latestStatus}</td>
                <td className="p-2">{r.youMentioned ? "Yes" : "No"}</td>
                <td className="p-2">{r.competitorsMentioned ? "Yes" : "No"}</td>
                <td className="p-2">{r.citationsCount}</td>
                <td className="p-2">
                  <div className="space-y-2">
                    <a href={`?view=${r.prompt.id}`} className="rounded border px-2 py-1">View answer</a>
                    <RunControls promptId={r.prompt.id} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-600">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnswerDrawerMount id={typeof (sp.view || "") === "string" ? (sp.view as string) : ""} />
    </div>
  );
} 