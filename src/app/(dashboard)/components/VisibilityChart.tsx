"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type Series = { key: string; name: string; color: string };

export default function VisibilityChart({ points, series }: { points: Array<Record<string, number | string>>; series: Series[] }) {
  function downloadCSV() {
    if (!points.length) return;
    const headers = ["date", ...series.map((s) => s.name)];
    const rows = points.map((p) => {
      const date = String(p.date || "");
      const vals = series.map((s) => String(p[s.key] ?? ""));
      return [date, ...vals].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visibility.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-80 w-full rounded border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-gray-600">Visibility % (mentions per day)</div>
        <button onClick={downloadCSV} className="rounded border px-2 py-1 text-sm">Download</button>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(val) => `${val as number}%`} />
          <Legend />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 