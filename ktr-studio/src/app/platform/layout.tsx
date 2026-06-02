"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BRAND } from "./_data";
import { icons, Avatar } from "./_components";
import { DemoBanner } from "./_states";
import { DEMO_MODE } from "@/lib/config";

const nav = [
  { href: "/platform", label: "Dashboard", icon: icons.dashboard, exact: true },
  { href: "/platform/pipeline", label: "Content pipeline", icon: icons.pipeline },
  { href: "/platform/studio", label: "Studio (AI)", icon: icons.studio },
  { href: "/platform/leads", label: "Leads & Omzet", icon: icons.leads },
  { href: "/platform/analytics", label: "Analytics", icon: icons.analytics },
  { href: "/platform/reports", label: "Rapporten", icon: icons.reports },
  { href: "/platform/clients", label: "Klanten", icon: icons.clients },
];

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.06] bg-[#080808] sticky top-0 h-screen">
        {/* Brand (white-label slot) */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/[0.06]">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-background">
            {icons.spark}
          </span>
          <span className="font-display font-extrabold text-lg tracking-tight">
            {BRAND.name.split(" ")[0]}
            <span className="text-muted font-normal"> {BRAND.name.split(" ")[1]}</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ${
                  active
                    ? "bg-accent/[0.10] text-foreground border border-accent/25"
                    : "text-muted hover:text-foreground hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <span className={active ? "text-accent" : ""}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Workspace footer */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/[0.02]">
            <Avatar initials="MK" size={32} />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Menno Kater</div>
              <div className="text-[11px] text-muted truncate">Agency owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4 px-5 md:px-8">
          <div className="flex items-center gap-2 text-muted lg:hidden">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-background">
              {icons.spark}
            </span>
            <span className="font-display font-extrabold">{BRAND.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-md rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2 text-muted">
            <span className="opacity-60">{icons.search}</span>
            <span className="text-sm">Zoek klanten, content, leads…</span>
            <span className="ml-auto font-mono text-[10px] border border-white/10 rounded px-1.5 py-0.5">
              ⌘K
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative grid place-items-center w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.02] text-muted hover:text-foreground transition-colors">
              {icons.bell}
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-accent" />
            </button>
            <Link
              href="/platform/studio"
              className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2 transition-colors"
            >
              {icons.plus}
              <span className="hidden sm:inline">Nieuwe content</span>
            </Link>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 px-5 md:px-8 py-7 md:py-9 max-w-[1400px] w-full mx-auto">
          {DEMO_MODE && <DemoBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}
