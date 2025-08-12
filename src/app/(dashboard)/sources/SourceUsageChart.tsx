"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type UsagePoint = { date: string; [domain: string]: number | string };

function formatLongDate(isoDay: string) {
  const d = new Date(isoDay + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const COLORS = [
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#a855f7", // violet
  "#ef4444", // red
  "#22c55e", // green (fallbacks if >5)
  "#3b82f6",
];

export default function SourceUsageChart({ points, domains }: { points: UsagePoint[]; domains: string[] }) {
  const domainColors = domains.map((_, i) => COLORS[i % COLORS.length]);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm">
      <div className="mb-1 text-lg font-semibold text-gray-800">Source Usage by Domain</div>
      <div className="mb-4 text-sm text-gray-500">Times the Top 5 Domains were sourced in the Chats</div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${Math.round(v)}%`} tick={{ fill: "#6b7280", fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const byDomain: { name: string; value: number; color: string }[] = [];
                for (let i = 0; i < payload.length; i++) {
                  const p = payload[i];
                  if (typeof p.value === "number" && p.dataKey) {
                    byDomain.push({ name: String(p.dataKey), value: p.value, color: p.color || domainColors[i] });
                  }
                }
                byDomain.sort((a, b) => b.value - a.value);
                return (
                  <div className="rounded-lg border border-gray-200 bg-white/95 p-3 shadow-md">
                    <div className="mb-2 text-xs font-medium text-gray-700">{formatLongDate(String(label))}</div>
                    <div className="space-y-1 text-xs">
                      {byDomain.map((d) => (
                        <div key={d.name} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-700">{d.name}</span>
                          </div>
                          <span className="tabular-nums text-gray-600">{d.value.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {domains.map((d, i) => (
              <Line
                key={d}
                type="monotone"
                dataKey={d}
                stroke={domainColors[i]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 