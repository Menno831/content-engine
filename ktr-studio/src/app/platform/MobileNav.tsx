"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { icons } from "./_components";
import { Portal } from "./Portal";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function MobileNav({ groups, brandName }: { groups: NavGroup[]; brandName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const brandParts = brandName.split(" ");

  // Swipe-gestures op telefoon: vanaf de linkerkant naar rechts vegen
  // opent het menu, naar links vegen sluit het weer. Native listeners
  // (passief, dus scrollen blijft soepel); verticale veegjes negeren we.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let fromEdge = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      // Open-gebaar alleen vanaf de linkerkant van het scherm, zodat
      // horizontaal scrollen midden op de pagina gewoon blijft werken.
      fromEdge = t.clientX < 40;
      tracking = fromEdge || openRef.current;
    }
    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dy) > 50) {
        tracking = false; // dit is scrollen, geen veeg
        return;
      }
      if (!openRef.current && fromEdge && dx > 55) {
        setOpen(true);
        tracking = false;
      } else if (openRef.current && dx < -55) {
        setOpen(false);
        tracking = false;
      }
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
    };
  }, []);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.02] text-muted hover:text-foreground transition-colors"
        aria-label="Menu"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-72 max-w-[85vw] h-full bg-[#080808] border-r border-white/[0.06] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-background">{icons.spark}</span>
                <span className="font-display font-extrabold text-lg tracking-tight">
                  {brandParts[0]}
                  {brandParts[1] && <span className="text-muted font-normal"> {brandParts.slice(1).join(" ")}</span>}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground text-xl leading-none">×</button>
            </div>
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
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
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
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
