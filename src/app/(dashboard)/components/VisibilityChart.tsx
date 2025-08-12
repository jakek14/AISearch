"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type Point = { date: string; openai?: number; anthropic?: number; gemini?: number };

export default function VisibilityChart({ points }: { points: Point[] }) {
  return (
    <div className="h-80 w-full rounded border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gOpenAI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gAnthropic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gGemini" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="openai" stroke="#3b82f6" fillOpacity={1} fill="url(#gOpenAI)" name="OpenAI" />
          <Area type="monotone" dataKey="anthropic" stroke="#10b981" fillOpacity={1} fill="url(#gAnthropic)" name="Anthropic" />
          <Area type="monotone" dataKey="gemini" stroke="#f59e0b" fillOpacity={1} fill="url(#gGemini)" name="Gemini" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 