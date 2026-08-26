"use client";

// ════════════════════════════════════════════════════════════════
// Vooruitblik: projectie voor de komende 6 maanden + klikbare
// maanddoelen. De projectie is transparant opgebouwd (MRR + het
// gemiddelde "losse werk" van de laatste 3 maanden + concepten
// voor de lopende maand) — geen zwarte doos.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtEur } from "../_data";
import { setMonthGoalAction } from "./actions";

export interface OutlookMonth {
  month: string;      // YYYY-MM
  label: string;      // "sep"
  projected: number;
  goal: number | null;
  note: string | null;
  isCurrent: boolean;
}

export function OutlookCard({
  months,
  basis,
}: {
  months: OutlookMonth[];
  basis: { mrr: number; avgExtra: number; drafts: number };
}) {
  const [edit, setEdit] = useState<OutlookMonth | null>(null);
  const [goal, setGoal] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openEdit(m: OutlookMonth) {
    setEdit(m);
    setGoal(m.goal ? String(m.goal) : "");
    setNote(m.note ?? "");
    setError(null);
  }

  function save() {
    if (!edit) return;
    start(async () => {
      const r = await setMonthGoalAction(edit.month, Number(goal) || 0, note);
      if (!r.ok) setError(r.error ?? "Opslaan mislukt.");
      else setEdit(null);
    });
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Vooruitblik</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Komende 6 maanden</h2>
        </div>
        <p className="text-[11.5px] text-muted max-w-sm">
          Projectie = retainers ({fmtEur(basis.mrr)}) + gemiddeld los werk van de laatste 3 maanden
          ({fmtEur(Math.round(basis.avgExtra))}){basis.drafts > 0 ? ` · lopende maand + concepten (${fmtEur(basis.drafts)})` : ""}.
          Klik een maand om je eigen doel te zetten.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {months.map((m) => {
          const target = m.goal ?? null;
          const pct = target ? Math.min(100, Math.round((m.projected / target) * 100)) : null;
          return (
            <button
              key={m.month}
              onClick={() => openEdit(m)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-all hover:border-accent/40 ${
                m.isCurrent ? "border-accent/40 bg-accent/[0.06]" : "border-white/[0.07]"
              }`}
            >
              <div className="font-mono text-[10px] uppercase text-muted mb-1">{m.label}</div>
              <div className="font-mono text-sm">{fmtEur(Math.round(m.projected))}</div>
              {target ? (
                <>
                  <div className="text-[10.5px] text-muted mt-1">doel {fmtEur(target)}</div>
                  <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full ${pct! >= 100 ? "bg-emerald-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                  </div>
                </>
              ) : (
                <div className="text-[10.5px] text-muted/60 mt-1">+ doel zetten</div>
              )}
            </button>
          );
        })}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-lg mb-1">
              Doel voor {new Date(`${edit.month}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
            </h3>
            <p className="text-[12px] text-muted mb-3">Projectie: {fmtEur(Math.round(edit.projected))} — zet je doel iets daarboven zodat er iets te mikken valt.</p>
            <label className="block mb-3">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Omzetdoel (€)</span>
              <input
                type="number"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="bv. 12000"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Hoe ga je 'm halen (kort)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="bv. 2 nieuwe retainers + concepten versturen"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40"
              />
            </label>
            {error && <p className="text-[12.5px] text-red-400 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEdit(null)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                Annuleren
              </button>
              <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                {pending ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
