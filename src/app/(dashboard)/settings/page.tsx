"use client";
export const dynamic = "force-dynamic";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  async function openCheckout() {
    try {
      setLoading("checkout");
      const res = await fetch("/api/billing/checkout", { method: "GET" });
      if (!res.ok) throw new Error("Failed to create session");
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url as string;
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    try {
      setLoading("portal");
      const res = await fetch("/api/billing/portal", { method: "GET" });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      // Some hosts return JSON with url
      try {
        const data = (await res.json()) as { url?: string };
        if (data.url) window.location.href = data.url as string;
      } catch {
        // ignore
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <SignedOut>
        <div className="mx-auto max-w-md rounded border bg-white p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold">Settings</h1>
          <p className="mb-4 text-sm text-gray-600">Sign in to manage settings.</p>
          <SignInButton>
            <button className="rounded bg-black px-4 py-2 text-white">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
        <div className="space-x-3">
          <button
            onClick={openCheckout}
            disabled={loading !== null}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading === "checkout" ? "Opening..." : "Upgrade Plan"}
          </button>
          <button
            onClick={openPortal}
            disabled={loading !== null}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            {loading === "portal" ? "Opening..." : "Manage Billing"}
          </button>
        </div>
      </SignedIn>
    </div>
  );
} 