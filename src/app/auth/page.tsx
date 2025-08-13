"use client";

import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Auth } from "@supabase/auth-ui-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthPage() {
	const supabase = getSupabaseClient();
	const sp = useSearchParams();
	const router = useRouter();
	useEffect(() => {
		if (!supabase) return;
		supabase.auth.getSession().then((s) => {
			if (s.data.session) router.replace("/dashboard");
		});
		const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
			if (session) router.replace("/dashboard");
		});
		return () => sub?.subscription.unsubscribe();
	}, []);
	if (!supabase) {
		return (
			<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
				Supabase is not configured.
			</div>
		);
	}
	const view = sp.get("view") === "sign_up" ? "sign_up" : "sign_in";
	return (
		<div className="max-w-md">
			<h1 className="mb-4 text-2xl font-semibold">{view === "sign_up" ? "Sign up" : "Sign in"}</h1>
			<div className="rounded border bg-white p-4">
				<Auth
					supabaseClient={supabase}
					appearance={{ theme: ThemeSupa }}
					providers={[]}
					view={view as any}
				/>
			</div>
		</div>
	);
} 