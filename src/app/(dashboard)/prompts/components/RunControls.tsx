"use client";
import { useState } from "react";

export default function RunControls({ promptId }: { promptId: string }) {
  const [provider, setProvider] = useState("openai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/run?promptId=${encodeURIComponent(promptId)}&provider=${provider}`, { method: "POST" });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const body = contentType.includes("application/json") ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
        const msg = typeof body === "string" ? body : body.error || "Failed to run";
        throw new Error(msg);
      }
      // Open the answer drawer for this prompt
      const url = new URL(window.location.href);
      url.searchParams.set("view", promptId);
      window.location.href = url.toString();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border px-2 py-1 text-sm">
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="gemini">Gemini</option>
      </select>
      <button onClick={run} disabled={loading} className="rounded bg-black px-2 py-1 text-sm text-white disabled:opacity-50">
        {loading ? "Running…" : "Run"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
} 