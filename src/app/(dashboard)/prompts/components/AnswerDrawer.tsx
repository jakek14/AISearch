"use client";
import { useEffect, useState } from "react";

type Props = { promptId: string; open: boolean; onClose: () => void };

type RunResponse = {
  run: { id: string; provider: string; finishedAt: string | null } | null;
  answer: { id: string; text: string } | null;
  citations: { id: string; url: string; domain: string; title?: string | null }[];
};

export default function AnswerDrawer({ promptId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RunResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/answers/latest?promptId=${encodeURIComponent(promptId)}`);
        const contentType = res.headers.get("content-type") || "";
        const json = contentType.includes("application/json") ? await res.json() : JSON.parse(await res.text());
        if (!cancelled) setData(json as RunResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, promptId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">Latest Answer</div>
          <button onClick={onClose} className="rounded border px-2 py-1 text-sm">Close</button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-4">
          {loading && <div className="text-sm text-gray-600">Loading…</div>}
          {!loading && data?.answer && (
            <>
              <div className="whitespace-pre-wrap text-sm leading-6">{data.answer.text}</div>
              <div>
                <div className="mb-1 text-sm font-medium">Citations</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {data.citations.map((c) => (
                    <li key={c.id}>
                      <a href={c.url} target="_blank" className="text-blue-600 underline">
                        {c.title || c.domain}
                      </a>
                      <span className="ml-2 text-gray-600">({c.domain})</span>
                    </li>
                  ))}
                  {data.citations.length === 0 && <li className="list-none text-gray-600">No citations</li>}
                </ul>
              </div>
            </>
          )}
          {!loading && !data?.answer && <div className="text-sm text-gray-600">No answer yet.</div>}
        </div>
      </div>
    </div>
  );
} 