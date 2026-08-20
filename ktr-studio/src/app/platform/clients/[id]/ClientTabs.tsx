"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Pipeline" },
  { slug: "stats", label: "Stats" },
  { slug: "stories", label: "Stories" },
  { slug: "leads", label: "Leads" },
  { slug: "links", label: "Links" },
  { slug: "calls", label: "Calls" },
  { slug: "health", label: "Health" },
  { slug: "profiel", label: "Profiel" },
];

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/platform/clients/${clientId}`;
  const current = pathname === base ? "" : pathname.replace(`${base}/`, "").split("/")[0];

  return (
    <div className="flex gap-1 mb-6 overflow-x-auto border-b border-white/[0.06] -mx-1 px-1">
      {TABS.map((t) => {
        const active = current === t.slug;
        return (
          <Link
            key={t.slug || "pipeline"}
            href={t.slug ? `${base}/${t.slug}` : base}
            className={`shrink-0 px-3.5 py-2.5 text-[13.5px] border-b-2 -mb-px transition-all ${
              active
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
