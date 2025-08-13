"use client";

import { useEffect, useState, useTransition } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { UserResponse } from "@supabase/supabase-js";

export default function ProfilePage() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [pending, start] = useTransition();

	useEffect(() => {
		const supabase = getSupabaseClient();
		if (!supabase) return;
		supabase.auth.getUser().then((res: UserResponse) => {
			if (res.error) return;
			setEmail(res.data.user?.email || "");
		});
	}, []);

	function updateEmail() {
		const supabase = getSupabaseClient();
		if (!supabase) return;
		setStatus(null);
		start(async () => {
			const session = await supabase.auth.getSession();
			const token = session.data.session?.access_token;
			if (!token) {
				setStatus("Not signed in");
				return;
			}
			const res = await fetch("/api/profile/update-email", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, accessToken: token }),
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				setStatus(j.error || "Failed to update email");
				return;
			}
			setStatus("Email updated.");
		});
	}

	function signOut() {
		const supabase = getSupabaseClient();
		if (!supabase) return;
		supabase.auth.signOut().then(() => (window.location.href = "/"));
	}

	const supabase = getSupabaseClient();
	if (!supabase) {
		return (
			<div className="space-y-3">
				<h1 className="text-2xl font-semibold">Profile</h1>
				<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
					Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Profile</h1>
			<div className="rounded border bg-white p-4 space-y-2 max-w-md">
				<label className="block text-sm font-medium">Email</label>
				<input
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="w-full rounded border px-2 py-1"
					type="email"
				/>
				<button onClick={updateEmail} disabled={pending} className="rounded bg-black px-3 py-1 text-white">
					{pending ? "Saving…" : "Update email"}
				</button>
				{status && <div className="text-sm text-gray-700">{status}</div>}
			</div>
			<div>
				<button onClick={signOut} className="rounded border px-3 py-1 text-sm">Sign out</button>
			</div>
		</div>
	);
} 