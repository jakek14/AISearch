import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
}

export default async function MentionsPage() {
  const rows = await prisma.mentionEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 100 });
  const brands = await prisma.brand.findMany();
  const prompts = await prisma.prompt.findMany();
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const promptMap = new Map(prompts.map((p) => [p.id, p.text]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mentions</h1>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border bg-white p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.provider}</span>
              <span className="text-gray-500">{timeAgo(r.occurredAt)}</span>
              {r.position ? <span className="rounded bg-blue-50 px-2 py-0.5 text-xs">{r.position}st</span> : null}
            </div>
            <div className="mt-1 font-medium">{brandMap.get(r.brandId) || r.brandId}</div>
            <div className="text-gray-700">{promptMap.get(r.promptId) || "Prompt"}</div>
            {r.excerpt ? <div className="mt-1 text-gray-600">“{r.excerpt}”</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
} 