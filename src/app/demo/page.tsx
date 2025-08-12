export const dynamic = "force-dynamic";
import Link from "next/link";
import VisibilityChart from "@/app/(dashboard)/components/VisibilityChart";

const samplePoints = Array.from({ length: 15 }).map((_, i) => {
  const date = new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return {
    date,
    openai: Math.max(0, Math.min(100, 45 + Math.sin((i / 14) * Math.PI * 2) * 20 + (i % 3) * 3)),
    anthropic: Math.max(0, Math.min(100, 35 + Math.cos((i / 14) * Math.PI * 2) * 18 + ((i + 1) % 4) * 2)),
    gemini: Math.max(0, Math.min(100, 25 + Math.sin((i / 14) * Math.PI * 2 + 1) * 15 + (i % 2) * 4)),
  };
});

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AISearch Demo</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded border px-3 py-1.5 text-sm">Home</Link>
            <a
              href="https://github.com/jakek14/AISearch"
              target="_blank"
              rel="noreferrer"
              className="rounded bg-black px-3 py-1.5 text-sm text-white"
            >
              GitHub
            </a>
          </div>
        </header>

        <p className="mb-6 text-sm text-gray-600">
          This public demo shows synthetic metrics and a sample visibility chart without requiring sign-in or a database.
        </p>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border bg-white p-4">
            <div className="text-xs text-gray-500">Runs (7d)</div>
            <div className="mt-1 text-xl font-semibold">1,284</div>
          </div>
          <div className="rounded border bg-white p-4">
            <div className="text-xs text-gray-500">New Citations (7d)</div>
            <div className="mt-1 text-xl font-semibold">342</div>
          </div>
          <div className="rounded border bg-white p-4">
            <div className="text-xs text-gray-500">Est. Cost (7d)</div>
            <div className="mt-1 text-xl font-semibold">$47.12</div>
          </div>
          <div className="rounded border bg-white p-4">
            <div className="text-xs text-gray-500">Prompts Tracked</div>
            <div className="mt-1 text-xl font-semibold">36</div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Visibility % by provider (sample)</div>
          <VisibilityChart points={samplePoints} />
        </div>

        <div className="mt-8 rounded border bg-white p-4 text-sm text-gray-700">
          <p className="mb-2 font-medium">What you get in the full app</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Track brand mentions and citations across AI providers</li>
            <li>Per-prompt analytics with answers and source links</li>
            <li>Opportunities view: domains AI trusts and outreach ideas</li>
          </ul>
          <div className="mt-4 flex gap-3">
            <Link href="/prompts" className="rounded bg-black px-3 py-1.5 text-white">View Prompts</Link>
            <Link href="/opportunities" className="rounded border px-3 py-1.5">View Opportunities</Link>
          </div>
        </div>
      </section>
    </main>
  );
} 