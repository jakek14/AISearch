"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn } from "@clerk/nextjs";
import { BarChart3, FileText, Target, Settings } from "lucide-react";

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).includes("placeholder")
);

const navItems = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/prompts", label: "Prompts", icon: FileText },
  { href: "/opportunities", label: "Opportunities", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main className="flex min-h-screen [background:var(--background)] [color:var(--foreground)]">
      <aside className="w-64 border-r bg-white">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-semibold">
            AI Visibility
          </Link>
          {hasClerk ? (
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          ) : null}
        </div>
        <div className="px-4 py-2 text-sm text-gray-500">Organization: Coming soon</div>
        <nav className="mt-2 space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                  active ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="container mx-auto max-w-5xl flex-1 p-6">{children}</section>
    </main>
  );
} 