"use client";

import { Portal } from "./Portal";

import Link from "next/link";
import { useState, useTransition } from "react";
import { icons } from "./_components";
import { markNotificationsReadAction } from "./todos/actions";
import type { Notification } from "./_data";

const typeColor: Record<string, string> = {
  ideation: "#F97316",
  approval: "#A78BFA",
  todo: "#34D399",
  info: "#60A5FA",
};

export function NotificationsBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  // Paneel openen = gezien: het oranje bolletje verdwijnt meteen (lokaal)
  // en de meldingen worden op de achtergrond als gelezen gemarkeerd.
  const [seen, setSeen] = useState(false);
  const [, startRead] = useTransition();
  const unread = seen ? 0 : notifications.filter((n) => !n.read).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setSeen(true);
      startRead(() => markNotificationsReadAction());
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative grid place-items-center w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.02] text-muted hover:text-foreground transition-colors"
      >
        {icons.bell}
        {unread > 0 && <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-accent" />}
      </button>

      {open && (
        <>
          <Portal><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /></Portal>
          <Portal><div className="fixed top-16 right-3 left-3 sm:left-auto sm:right-6 sm:w-80 max-h-[26rem] overflow-y-auto z-50 rounded-2xl border border-white/[0.08] bg-card shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="font-display font-bold text-sm">Meldingen</span>
              {unread > 0 && (
                <form action={markNotificationsReadAction}>
                  <button className="text-[12px] text-accent hover:text-accent-hover">Alles gelezen</button>
                </form>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">Geen meldingen</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifications.map((n) => {
                  const inner = (
                    <div className={`flex gap-3 px-4 py-3 ${n.read ? "opacity-60" : ""} hover:bg-white/[0.02] transition-colors`}>
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: typeColor[n.type] ?? "#60A5FA" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{n.title}</div>
                        {n.body && <div className="text-[12px] text-muted leading-snug mt-0.5">{n.body}</div>}
                        <div className="text-[11px] text-muted/70 mt-1">{n.date}</div>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })}
              </div>
            )}
          </div></Portal>
        </>
      )}
    </div>
  );
}
