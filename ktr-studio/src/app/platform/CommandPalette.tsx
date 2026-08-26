"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { icons } from "./_components";
import { Portal } from "./Portal";

interface Item {
  href: string;
  label: string;
  icon?: ReactNode;
}

export function CommandPalette({ items, placeholder }: { items: Item[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2.5 flex-1 max-w-md rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2 text-muted hover:border-white/[0.12] transition-colors"
      >
        <span className="opacity-60">{icons.search}</span>
        <span className="text-sm">{placeholder}</span>
        <span className="ml-auto font-mono text-[10px] border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
      </button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <span className="text-muted">{icons.search}</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered[0]) go(filtered[0].href);
                }}
                placeholder="Spring naar…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <span className="font-mono text-[10px] text-muted border border-white/10 rounded px-1.5 py-0.5">esc</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted">Niks gevonden</div>
              ) : (
                filtered.map((i) => (
                  <button
                    key={i.href}
                    onClick={() => go(i.href)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/[0.04] text-left transition-colors"
                  >
                    {i.icon && <span className="text-accent">{i.icon}</span>}
                    {i.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
