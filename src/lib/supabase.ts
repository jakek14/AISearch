import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Keep a single client instance in the browser across HMR
// and avoid multiple GoTrueClient instances under the same storage key.
declare global {
	// eslint-disable-next-line no-var
	var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

export function getSupabaseClient(): SupabaseClient | null {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
	if (!supabaseUrl || !supabaseAnonKey) return null;

	// Server: create a non-persistent client per request if ever needed
	if (typeof window === "undefined") {
		return createClient(supabaseUrl, supabaseAnonKey, {
			auth: { persistSession: false },
		});
	}

	// Client: singleton
	if (!globalThis.__SUPABASE_CLIENT__) {
		globalThis.__SUPABASE_CLIENT__ = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: true,
				storageKey: "aisearch-auth",
			},
		});
	}
	return globalThis.__SUPABASE_CLIENT__;
} 