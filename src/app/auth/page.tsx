"use client";

import { getSupabaseClient } from "@/lib/supabase";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthPage() {
	const router = useRouter();
	const sp = useSearchParams();
	const supabase = useMemo(() => getSupabaseClient(), []);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [pending, start] = useTransition();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!supabase) return;
		supabase.auth.getSession().then((s) => {
			if (s.data.session) router.replace("/dashboard");
		});
		const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
			if (session) router.replace("/dashboard");
		});
		return () => sub?.subscription.unsubscribe();
	}, [router, supabase]);
	if (!supabase) {
		return (
			<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
				Supabase is not configured.
			</div>
		);
	}
	const view = sp.get("view") === "sign_up" ? "sign_up" : "sign_in";

	async function handleNoConfirmSignUp() {
		if (!supabase) return;
		setError(null);
		start(async () => {
			const res = await fetch("/api/auth/sign-up", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				setError(j.error || "Sign up failed");
				return;
			}
			const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
			if (signInError) {
				setError(signInError.message);
				return;
			}
			router.replace("/dashboard");
		});
	}

	async function handleSignIn() {
		if (!supabase) return;
		setError(null);
		start(async () => {
			const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
			if (signInError) {
				setError(signInError.message);
				return;
			}
			router.replace("/dashboard");
		});
	}

	return (
		<div className="max-w-md space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{view === "sign_up" ? "Sign up" : "Sign in"}</h1>
				<div className="text-sm">
					{view === "sign_up" ? (
						<button onClick={() => router.replace("/auth")} className="underline">Have an account? Sign in</button>
					) : (
						<button onClick={() => router.replace("/auth?view=sign_up")} className="underline">Create account</button>
					)}
				</div>
			</div>

			<div className="rounded border bg-white p-4 space-y-2">
				<label className="block text-sm font-medium">Email</label>
				<input className="w-full rounded border px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} />
				<label className="block text-sm font-medium">Password</label>
				<input className="w-full rounded border px-2 py-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
				<button
					onClick={view === "sign_up" ? handleNoConfirmSignUp : handleSignIn}
					disabled={pending}
					className="rounded bg-black px-3 py-1 text-white"
				>
					{pending ? (view === "sign_up" ? "Creating…" : "Signing in…") : view === "sign_up" ? "Create account" : "Sign in"}
				</button>
				{error && <div className="text-sm text-red-700">{error}</div>}
			</div>
		</div>
	);
} 