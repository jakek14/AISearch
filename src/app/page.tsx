"use client";
import Link from "next/link";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white">
			<header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
				<Link href="/" className="text-lg font-semibold">AISearch</Link>
				<nav className="flex items-center gap-3">
					<Link href="/auth" className="rounded border px-3 py-1 text-sm">Log in</Link>
					<Link href="/auth?view=sign_up" className="rounded bg-black px-3 py-1 text-sm text-white">Sign up</Link>
				</nav>
			</header>
			<main className="mx-auto max-w-6xl px-6 py-16">
				<h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-gray-900">Understand your brand&rsquo;s visibility in AI answers.</h1>
				<p className="mt-4 max-w-2xl text-gray-600">Track mentions, citations, and share of AI voice across providers. Identify top sources and act on opportunities.</p>
				<div className="mt-8 flex gap-3">
					<Link href="/auth?view=sign_up" className="rounded bg-black px-4 py-2 text-white">Get started</Link>
					<Link href="/auth" className="rounded border px-4 py-2">I already have an account</Link>
				</div>
				<div className="mt-16 grid gap-6 md:grid-cols-3">
					<div className="rounded-xl border bg-white p-4 shadow-sm">
						<div className="text-sm font-medium">Prompts</div>
						<div className="mt-1 text-sm text-gray-600">Run prompts across OpenAI, Anthropic, and Gemini. See answers and citations.</div>
					</div>
					<div className="rounded-xl border bg-white p-4 shadow-sm">
						<div className="text-sm font-medium">Visibility</div>
						<div className="mt-1 text-sm text-gray-600">Daily visibility snapshots and share of voice across providers and topics.</div>
					</div>
					<div className="rounded-xl border bg-white p-4 shadow-sm">
						<div className="text-sm font-medium">Sources</div>
						<div className="mt-1 text-sm text-gray-600">Top cited domains with usage trends and opportunities for outreach.</div>
					</div>
				</div>
			</main>
		</div>
	);
} 