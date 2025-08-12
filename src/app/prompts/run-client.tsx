"use client";
import { useState } from "react";
import type { ProviderName } from "@/lib/providers";

type Props = { promptId: string };

type RunResponse = {
  run: { id: string; provider: string; model: string; status: string };
  answer: { id: string; text: string };
  citations: { url: string; domain: string; title?: string | null; rankHint?: number | null }[];
};

export default function RunClient({ promptId }: Props) {
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/run?promptId=${encodeURIComponent(promptId)}&provider=${provider}`, {
        method: "POST",
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        if (contentType.includes("application/json")) {
          try {
            const data = JSON.parse(bodyText) as { error?: string };
            throw new Error(data.error || bodyText || "Failed to run");
          } catch {
            throw new Error(bodyText || "Failed to run");
          }
        }
        throw new Error(bodyText || `HTTP ${res.status}`);
      }
      const data = (contentType.includes("application/json")
        ? ((await res.json()) as RunResponse)
        : (JSON.parse(await res.text()) as RunResponse));
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderName)}
          className="rounded border px-2 py-1"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Claude</option>
          <option value="gemini">Gemini</option>
        </select>
        <button onClick={run} disabled={loading} className="rounded bg-black px-3 py-1 text-white disabled:opacity-50">
          {loading ? "Running..." : "Run"}
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <div className="rounded border bg-gray-50 p-3 text-sm">
          <div className="mb-2 font-medium">Answer</div>
          <div className="whitespace-pre-wrap">{result.answer.text}</div>
          <div className="mt-3 font-medium">Citations</div>
          <ul className="list-disc pl-5">
            {result.citations.map((c, i) => (
              <li key={i}>
                <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {c.domain}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 