"use client";

import { useState, useTransition } from "react";
import { todayStr } from "@/lib/dates";
import { setFollowupAction } from "./actions";

// Compacte follow-up editor op een lead-kaart: datum + korte notitie.
// Kleurt rood als de datum verstreken is (vandaag of eerder).
export function FollowupControl({
  leadId,
  date,
  note,
}: {
  leadId: string;
  date: string | null;
  note: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(date ?? "");
  const [n, setN] = useState(note ?? "");
  const [pending, start] = useTransition();

  const today = todayStr();
  const due = date && date <= today;

  function save() {
    start(async () => {
      await setFollowupAction(leadId, d, n);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`mt-2 w-full text-left rounded-lg border px-2.5 py-1.5 text-[11px] transition-all ${
          due
            ? "border-red-400/40 bg-red-400/[0.08] text-red-300"
            : date
              ? "border-white/[0.08] text-muted hover:border-accent/30"
              : "border-dashed border-white/[0.1] text-muted hover:border-accent/30 hover:text-accent"
        }`}
      >
        {date ? (
          <>
            {due ? "⏰ Opvolgen" : "📅 Opvolgen"} {new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            {note ? ` · ${note}` : ""}
          </>
        ) : (
          "+ Follow-up plannen"
        )}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-white/[0.1] bg-white/[0.02] p-2 space-y-1.5">
      <input
        type="date"
        value={d}
        onChange={(e) => setD(e.target.value)}
        className="w-full rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] outline-none focus:border-accent/40"
      />
      <input
        value={n}
        onChange={(e) => setN(e.target.value)}
        placeholder="Notitie (bv. 'wacht op prijs')"
        className="w-full rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] outline-none focus:border-accent/40"
      />
      <div className="flex gap-1.5">
        <button
          onClick={save}
          disabled={pending}
          className="flex-1 rounded bg-accent hover:bg-accent-hover text-background font-bold text-[11px] py-1 transition-colors disabled:opacity-60"
        >
          {pending ? "…" : "Opslaan"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded border border-white/[0.08] px-2 text-[11px] text-muted">
          ✕
        </button>
      </div>
    </div>
  );
}
