"use client";
export default function Filters() {
  return (
    <form className="flex items-center gap-3 rounded border bg-white p-4">
      <select name="status" className="rounded border px-2 py-1">
        <option value="">All status</option>
        <option value="new">New</option>
        <option value="in-progress">In progress</option>
        <option value="ignored">Ignored</option>
      </select>
      <button className="rounded bg-black px-3 py-1 text-white">Filter</button>
    </form>
  );
} 