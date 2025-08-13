"use client";

import { SignedIn, SignedOut, SignOutButton, UserProfile } from "@clerk/nextjs";

const hasClerk = Boolean(
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
		!String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).includes("placeholder")
);

export default function ProfilePage() {
	if (!hasClerk) {
		return (
			<div className="space-y-3">
				<h1 className="text-2xl font-semibold">Profile</h1>
				<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
					Authentication is not configured. Add your Clerk keys to enable profile management and sign out.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Profile</h1>
			<SignedIn>
				<div className="rounded border bg-white p-2">
					<UserProfile />
				</div>
				<div>
					<SignOutButton>
						<button className="mt-3 rounded border px-3 py-1 text-sm">Sign out</button>
					</SignOutButton>
				</div>
			</SignedIn>
			<SignedOut>
				<div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">You are signed out.</div>
			</SignedOut>
		</div>
	);
} 