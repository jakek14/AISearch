import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/", // homepage public
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/clerk(.*)",
  "/api/health",
  "/api/stripe/webhook",
  "/api/run",
  "/api/run-test",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
}; 