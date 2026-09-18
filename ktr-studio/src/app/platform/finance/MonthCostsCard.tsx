"use client";

// ════════════════════════════════════════════════════════════════
// Kosten die bij een maand horen maar niet bij één factuur: de
// maandfactuur van je editor, losse software, eenmalige uitgaven.
// Wat hier staat telt mee in de kostenhistorie en in je winst.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow, Badge } from "../_components";
import { fmtEur } from "../_data";
import { saveMonthCostAction, deleteMonthCostAction } from "./actions";

export interface MonthCost {
  id: string;
  month: string; // YYYY-MM
  kind: string;  // edit | software | overig
  label: string;
  amount: number;
  source: string | null;
}

const KIND: Record<string, { label: string; color: string }> = {
  edit: { label: "Edit", color: "#F97316" },
  software: { label: "Software", color: "#60A5FA" },
  overig: { label: "Overig", color: "#B5ADA6" },
};

export function MonthCostsCard({ month, monthLabel, costs }: { month: string; monthLabel: string; costs: MonthCost[] }) {
  const [edit, setEdit] = useState<Partial<MonthCost> | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const total = costs.reduce((s, c) => s + c.amount, 0);
  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  function save() {
    if (!edit) return;
    setError("");
    start(async () => {
      const r = await saveMonthCostAction({
        id: edit.id,
        month,
        kind: edit.kind ?? "overig",
        label: edit.label ?? "",
        amount: Number(edit.amount) || 0,
      });
      if (r.error) setError(r.error);
      else setEdit(null);
    });
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <Eyebrow>Kosten · {monthLabel}</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Wat er deze maand uitging</h2>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm">
              <span className="text-muted text-[12px]">Samen </span>
              <strong className="font-mono text-red-400">{fmtEur(Math.round(total))}</strong>
            </span>
          )}
          <button
            onClick={() => setEdit({ kind: "edit" })}
            className="rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[12.5px] px-3 py-1.5 transition-colors"
          >
            + Kostenpost
          </button>
        </div>
      </div>
      <p className="text-[13px] text-muted mb-4">
        Kosten die bij deze maand horen maar niet aan één factuur hangen — de maandfactuur van je editor, losse software, eenmalige uitgaven.
      </p>
      {error && <p className="text-[13px] text-red-400 mb-2">{error}</p>}

      {costs.length === 0 ? (
        <p className="text-[13px] text-muted">Niets ingevuld voor deze maand.</p>
      ) : (
        <div className="space-y-1">
          {costs.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => setEdit(c)} className="text-sm font-medium truncate hover:text-accent transition-colors">
                    {c.label} <span className="text-muted">✎</span>
                  </button>
                  <Badge color={KIND[c.kind]?.color ?? "#B5ADA6"}>{KIND[c.kind]?.label ?? c.kind}</Badge>
                </div>
                {c.source && <div className="text-[11px] text-muted mt-0.5">{c.source}</div>}
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono text-sm text-red-400">−{fmtEur(Math.round(c.amount))}</span>
                <button
                  onClick={() => start(async () => { const r = await deleteMonthCostAction(c.id); if (r.error) setError(r.error); })}
                  disabled={pending}
                  className="text-muted/50 hover:text-red-400 text-[13px] px-1 transition-colors disabled:opacity-50"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">{edit.id ? "Kostenpost" : `Kostenpost — ${monthLabel}`}</h3>
            <div className="space-y-3.5">
              <label className="block">
                <span className={label}>Wat</span>
                <input value={edit.label ?? ""} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="bv. Dualz Media — factuur juli" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Bedrag €</span>
                  <input value={edit.amount ?? ""} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })} type="number" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Soort</span>
                  <select value={edit.kind ?? "overig"} onChange={(e) => setEdit({ ...edit, kind: e.target.value })} className={field}>
                    <option value="edit" className="bg-card">Edit</option>
                    <option value="software" className="bg-card">Software</option>
                    <option value="overig" className="bg-card">Overig</option>
                  </select>
                </label>
              </div>
              {error && <p className="text-[13px] text-red-400">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEdit(null)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                  Annuleren
                </button>
                <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                  {pending ? "…" : "Opslaan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
