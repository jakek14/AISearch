import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    !String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).includes("placeholder") &&
    !String(process.env.CLERK_SECRET_KEY).includes("placeholder")
);

const isPublicRoute = createRouteMatcher([
  "/", // homepage public
  "/prompts(.*)",
  "/opportunities(.*)",
  "/settings(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/clerk(.*)",
  "/api/health",
  "/api/stripe/webhook",
  "/api/run",
  "/api/run-test",
  "/api/(.*)", // allow APIs in demo mode
]);

function passthroughMiddleware(req: Request) {
  const requestHeaders = new Headers(req.headers);
  // In demo mode, inject a stable demo user id for per-user scoping
  if (!requestHeaders.get("x-user-id")) requestHeaders.set("x-user-id", "demo-user");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

const middlewareImpl = isClerkConfigured ? protectedMiddleware : (passthroughMiddleware as any);

export default middlewareImpl;

export const config = {
  matcher: ["/((?!.*\\.\\w+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 