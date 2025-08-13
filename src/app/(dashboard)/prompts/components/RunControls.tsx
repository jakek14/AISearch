"use client";
import { useState } from "react";

export default function RunControls({ promptId }: { promptId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = ["openai", "anthropic", "gemini"] as const;

  async function runAll() {
    try {
      setLoading(true);
      setError(null);

      async function runProvider(provider: string) {
        const res = await fetch(`/api/run?promptId=${encodeURIComponent(promptId)}&provider=${provider}`, { method: "POST" });
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) {
          const body = contentType.includes("application/json") ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
          const msg = typeof body === "string" ? body : body.error || `Failed to run ${provider}`;
          throw new Error(msg);
        }
      }

      // Start all providers concurrently
      const tasks = providers.map((p) => runProvider(p));

      // Open as soon as the first provider succeeds
      await Promise.any(tasks);

      const url = new URL(window.location.href);
      url.searchParams.set("view", promptId);
      window.location.href = url.toString();

      // Do not await the remaining tasks; they will complete in the background
    } catch (e) {
      setError((e as Error).message || "Run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={runAll} disabled={loading} className="rounded bg-black px-2 py-1 text-sm text-white disabled:opacity-50">
        {loading ? "Running…" : "Run all"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
} 