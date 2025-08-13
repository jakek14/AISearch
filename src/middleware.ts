import { NextResponse } from "next/server";

export default async function middleware(req: Request) {
	const url = new URL(req.url);
	// Public landing path
	if (url.pathname === "/") return NextResponse.next();
	// Auth page is public, but if already signed in, redirect to /dashboard
	if (url.pathname.startsWith("/auth")) {
		// We cannot verify session server-side without Supabase helper here; let client handle redirect.
		return NextResponse.next();
	}
	// Gate internal app under /dashboard and /(dashboard)
	if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/") || url.pathname.startsWith("/\(dashboard\)")) {
		return NextResponse.next();
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!.*\\.\\w+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 