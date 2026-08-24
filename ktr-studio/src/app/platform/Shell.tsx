"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, CSSProperties } from "react";
import { icons, Avatar } from "./_components";
import { DemoBanner } from "./_states";
import { DEMO_MODE } from "@/lib/config";
import { signOut } from "../login/actions";
import { NotificationsBell } from "./NotificationsBell";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import type { Notification } from "./_data";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Gegroepeerde navigatie — overzichtelijk in mappen i.p.v. één lange lijst.
// FOCUS-MODUS: alles wat nu niet actief gebruikt wordt staat op non-actief
// (uit de nav, routes blijven via URL bereikbaar). Weer aanzetten = de
// regel hieronder terugzetten. Non-actief: Daily Brief, Studio, Boost,
// Prompts, AI Visuals, Brand Studio, Boards, Analytics.
const agencyGroups: NavGroup[] = [
  {
    title: "Home",
    items: [
      { href: "/platform", label: "Overzicht", icon: icons.dashboard, exact: true },
      { href: "/platform/clients", label: "Klanten", icon: icons.clients },
      { href: "/platform/todos", label: "Taken", icon: icons.check },
      { href: "/platform/agenda", label: "Agenda", icon: icons.calendar },
      { href: "/platform/eod", label: "EOD", icon: icons.thumb },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/platform/pipeline", label: "Productieboard", icon: icons.pipeline },
      { href: "/platform/scripts", label: "Scripts", icon: icons.reports },
      { href: "/platform/calendar", label: "Kalender", icon: icons.calendar },
      { href: "/platform/approvals", label: "Approvals", icon: icons.check },
    ],
  },
  {
    title: "Groei",
    items: [
      { href: "/platform/finance", label: "Finance", icon: icons.money },
      { href: "/platform/leads", label: "Leads", icon: icons.leads },
      { href: "/platform/outreach", label: "Outreach", icon: icons.rocket },
      { href: "/platform/advertising", label: "Advertenties", icon: icons.target },
      { href: "/platform/channels", label: "Eigen kanalen", icon: icons.analytics },
    ],
  },
  {
    title: "Zaken",
    items: [
      { href: "/platform/forms", label: "Formulieren", icon: icons.check },
      { href: "/platform/contracts", label: "Contracten", icon: icons.reports },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/platform/discover", label: "Discover", icon: icons.analytics },
      { href: "/platform/reports", label: "Rapporten", icon: icons.reports },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/platform/team", label: "Team", icon: icons.leads },
      { href: "/platform/editors", label: "Editors", icon: icons.studio },
      { href: "/platform/settings", label: "Instellingen", icon: icons.settings },
    ],
  },
];

// Klantportaal: alleen eigen content, prestaties en rapporten.
const clientGroups: NavGroup[] = [
  { title: "Overzicht", items: [{ href: "/platform", label: "Overzicht", icon: icons.dashboard, exact: true }] },
  {
    title: "Content",
    items: [
      { href: "/platform/pipeline", label: "Mijn content", icon: icons.pipeline },
      { href: "/platform/calendar", label: "Kalender", icon: icons.calendar },
      { href: "/platform/approvals", label: "Goedkeuren", icon: icons.check },
      { href: "/platform/todos", label: "Mijn taken", icon: icons.check },
    ],
  },
  {
    title: "Inzicht",
    items: [
      { href: "/platform/analytics", label: "Prestaties", icon: icons.analytics },
      { href: "/platform/reports", label: "Rapporten", icon: icons.reports },
    ],
  },
];

// Editor-schermen zijn Engels (editors zijn vaak Engelstalig).
const editorGroups: NavGroup[] = [
  {
    title: "Work",
    items: [
      { href: "/platform/pipeline", label: "Production board", icon: icons.pipeline },
      { href: "/platform/todos", label: "My tasks", icon: icons.check },
      { href: "/platform/eod", label: "End of day", icon: icons.thumb },
    ],
  },
];

const setterGroups: NavGroup[] = [
  {
    title: "Sales",
    items: [
      { href: "/platform", label: "Overzicht", icon: icons.dashboard, exact: true },
      { href: "/platform/leads", label: "CRM & Leads", icon: icons.leads },
    ],
  },
];

type Role = "owner" | "team" | "client" | "editor" | "setter";

function groupsFor(role: Role): NavGroup[] {
  if (role === "client") return clientGroups;
  if (role === "editor") return editorGroups;
  if (role === "setter") return setterGroups;
  return agencyGroups;
}

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function Shell({
  children,
  role,
  brandName,
  displayName,
  roleLabel,
  accent,
  notifications,
}: {
  children: ReactNode;
  role: Role;
  brandName: string;
  displayName: string;
  roleLabel: string;
  accent: string;
  notifications: Notification[];
}) {
  const pathname = usePathname();
  const isClient = role === "client";
  const isAgency = role === "owner" || role === "team";
  const groups = groupsFor(role);
  const flatNav = groups.flatMap((g) => g.items);
  const brandParts = brandName.split(" ");

  // White-label: hertint het hele platform met de agency-accentkleur.
  const themeStyle = {
    "--accent": accent,
    "--accent-hover": `color-mix(in srgb, ${accent}, white 18%)`,
  } as CSSProperties;

  return (
    <div className="min-h-screen flex bg-background text-foreground" style={themeStyle}>
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.06] bg-[#080808] sticky top-0 h-screen">
        {/* Brand (white-label slot) */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/[0.06]">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-background">
            {icons.spark}
          </span>
          <span className="font-display font-extrabold text-lg tracking-tight">
            {brandParts[0]}
            {brandParts[1] && <span className="text-muted font-normal"> {brandParts.slice(1).join(" ")}</span>}
          </span>
        </div>

        {/* Nav (gegroepeerd + scrollbaar) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted/70">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300 ${
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
              </div>
            </div>
          ))}
        </nav>

        {/* Workspace footer */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/[0.02]">
            <Avatar initials={initialsOf(displayName)} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-[11px] text-muted truncate">{roleLabel}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Uitloggen"
                className="grid place-items-center w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.05] transition-colors"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4 px-5 md:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav groups={groups} brandName={brandName} />
            <span className="font-display font-extrabold">{brandName}</span>
          </div>

          <CommandPalette items={flatNav} placeholder={isClient ? "Zoek in je content…" : "Spring naar… (⌘K)"} />

          <div className="flex items-center gap-2 ml-auto">
            <NotificationsBell notifications={notifications} />
            {isAgency && (
              <Link
                href="/platform/studio"
                className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2 transition-colors"
              >
                {icons.plus}
                <span className="hidden sm:inline">Nieuwe content</span>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 px-5 md:px-8 py-7 md:py-9 max-w-[1400px] w-full mx-auto">
          {DEMO_MODE && <DemoBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}
