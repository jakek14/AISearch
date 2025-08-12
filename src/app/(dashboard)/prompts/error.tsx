"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
			<div className="font-medium">Something went wrong loading Prompts.</div>
			<div className="mt-1 break-words opacity-80">{error?.message || "Unknown error"}</div>
			{error?.digest && <div className="mt-1 text-xs opacity-60">Digest: {error.digest}</div>}
			<button className="mt-3 rounded border px-3 py-1 text-red-800" onClick={() => reset()}>Retry</button>
		</div>
	);
} 