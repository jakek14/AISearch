"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn } from "@clerk/nextjs";
import { LayoutGrid, MessageSquare, Globe2, Tag, Users2, CreditCard, Receipt, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).includes("placeholder")
);

import type { LucideIcon } from "lucide-react";

function NavLink({ href, label, icon: Icon, badge }: { href: string; label: string; icon: LucideIcon; badge?: string | number }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {label}
      </span>
      {badge ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">{badge}</span> : null}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [competitorCount, setCompetitorCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/competitors/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.count === "number") setCompetitorCount(d.count);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="flex min-h-screen [background:var(--background)] [color:var(--foreground)]">
      <aside className="w-64 border-r bg-white">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-semibold">
            Startup
          </Link>
          {hasClerk ? (
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          ) : null}
        </div>

        <div className="space-y-6 p-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">General</div>
            <nav className="space-y-1">
              <NavLink href="/" label="Dashboard" icon={LayoutGrid} />
              <NavLink href="/prompts" label="Prompts" icon={MessageSquare} />
              <NavLink href="/sources" label="Sources" icon={Globe2} />
              <NavLink href="/company" label="Company" icon={Briefcase} />
            </nav>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Preferences</div>
            <nav className="space-y-1">
              <NavLink href="/competitors" label="Competitors" icon={Users2} badge={competitorCount ?? undefined} />
              <NavLink href="/tags" label="Tags" icon={Tag} />
            </nav>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</div>
            <nav className="space-y-1">
              <NavLink href="/billing" label="Billing" icon={CreditCard} />
              <NavLink href="/subscriptions" label="Subscriptions" icon={Receipt} />
            </nav>
          </div>
        </div>
      </aside>
      <section className="container mx-auto max-w-5xl flex-1 p-6">{children}</section>
    </main>
  );
} 