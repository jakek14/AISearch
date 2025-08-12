"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export type ToolbarProps = {
  brands: { id: string; name: string }[];
};

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Claude" },
  { id: "gemini", label: "Gemini" },
] as const;

export default function Toolbar({ brands }: ToolbarProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [days, setDays] = useState(sp.get("days") || "7");
  const [brandId, setBrandId] = useState(sp.get("brandId") || brands[0]?.id || "");
  const [provider, setProvider] = useState(sp.get("provider") || "all");

  const providerOptions = useMemo(() => [{ id: "all", label: "All" }, ...PROVIDERS], []);

  function apply() {
    const params = new URLSearchParams(sp.toString());
    params.set("days", days);
    if (brandId) params.set("brandId", brandId);
    else params.delete("brandId");
    if (provider && provider !== "all") params.set("provider", provider);
    else params.delete("provider");
    router.push("/?" + params.toString());
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white/60 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Range</span>
        <select value={days} onChange={(e) => setDays(e.target.value)} className="rounded-md border px-2 py-1 text-sm">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Brand</span>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="min-w-[8rem] rounded-md border px-2 py-1 text-sm">
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Provider</span>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-md border px-2 py-1 text-sm">
          {providerOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ml-auto">
        <button onClick={apply} className="rounded-md bg-black px-3 py-1.5 text-sm text-white shadow-sm hover:bg-gray-800">
          Apply
        </button>
      </div>
    </div>
  );
} 