"use client";

// ════════════════════════════════════════════════════════════════
// Pijplijn: klanten waar je serieus mee in gesprek bent. De fase
// bepaalt de kans, dus je hoeft alleen het maandbedrag en de fase te
// kiezen. De gewogen som telt mee in de vooruitblik hierboven.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow, Badge } from "../_components";
import { fmtEur } from "../_data";
import { DEAL_META, type Deal, type DealStage } from "@/lib/deals-shared";
import { saveDealAction, deleteDealAction, dealToClientAction } from "./actions";

const OPEN_STAGES: DealStage[] = ["gesprek", "voorstel", "mondeling_ja"];
const money = (n: number, c: string) => `${c === "USD" ? "$" : "€"}${Math.round(n).toLocaleString("nl-NL")}`;

export function PipelineCard({ deals, weighted, usdRate }: { deals: Deal[]; weighted: number; usdRate: number }) {
  const [edit, setEdit] = useState<Partial<Deal> | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const closed = deals.filter((d) => !OPEN_STAGES.includes(d.stage));
  const totalIfAll = open.reduce((s, d) => s + (d.currency === "USD" ? d.monthlyValue * usdRate : d.monthlyValue), 0);
  const missing = open.filter((d) => d.monthlyValue <= 0).length;

  const nextMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  function save() {
    if (!edit) return;
    setError("");
    start(async () => {
      const r = await saveDealAction({
        id: edit.id,
        name: edit.name ?? "",
        monthlyValue: Number(edit.monthlyValue) || 0,
        currency: edit.currency ?? "EUR",
        stage: edit.stage ?? "gesprek",
        startsMonth: edit.startsMonth ?? nextMonth,
        note: edit.note ?? null,
      });
      if (r.error) setError(r.error);
      else setEdit(null);
    });
  }

  function remove(id: string) {
    if (!confirm("Deze deal verwijderen?")) return;
    start(async () => {
      const r = await deleteDealAction(id);
      if (r.error) setError(r.error);
    });
  }

  function toClient(d: Deal) {
    if (!confirm(`${d.name} als klant toevoegen met ${money(d.monthlyValue, d.currency)} per maand?`)) return;
    start(async () => {
      const r = await dealToClientAction(d.id);
      if (r.error) setError(r.error);
    });
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <Card id="pijplijn" className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <Eyebrow>Pijplijn</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Deals waar je mee bezig bent</h2>
        </div>
        <div className="flex items-center gap-3">
          {open.length > 0 && (
            <span className="text-sm text-right">
              <span className="text-muted text-[12px]">Gewogen </span>
              <strong className="font-mono text-accent">{fmtEur(Math.round(weighted))}</strong>
              <span className="text-muted text-[12px]"> van {fmtEur(Math.round(totalIfAll))}</span>
            </span>
          )}
          <button
            onClick={() => setEdit({ stage: "gesprek", currency: "EUR", startsMonth: nextMonth })}
            className="rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[12.5px] px-3 py-1.5 transition-colors"
          >
            + Deal
          </button>
        </div>
      </div>
      <p className="text-[13px] text-muted mb-4">
        De fase bepaalt de kans: gesprek 25%, voorstel 50%, mondeling ja 80%. Dat gewogen bedrag telt mee in de vooruitblik.
        {missing > 0 && <span className="text-amber-300"> {missing} deal{missing === 1 ? "" : "s"} zonder bedrag telt nog voor niets mee.</span>}
      </p>
      {error && <p className="text-[13px] text-red-400 mb-2">{error}</p>}

      <div className="space-y-1">
        {open.length === 0 && closed.length === 0 && (
          <p className="text-[13px] text-muted">Nog geen deals — zet erin met wie je in gesprek bent, dan zie je wat het kan worden.</p>
        )}
        {[...open, ...closed].map((d) => {
          const meta = DEAL_META[d.stage];
          const isOpen = OPEN_STAGES.includes(d.stage);
          return (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => setEdit(d)} className="text-sm font-medium truncate hover:text-accent transition-colors">
                    {d.name} <span className="text-muted">✎</span>
                  </button>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {d.startsMonth ? `vanaf ${new Date(`${d.startsMonth}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}` : "startmaand onbekend"}
                  {d.note ? ` · ${d.note}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono text-sm">{d.monthlyValue > 0 ? `${money(d.monthlyValue, d.currency)}/mnd` : <span className="text-amber-300">bedrag?</span>}</span>
                {isOpen && (
                  <span className="font-mono text-[12px] text-accent">
                    ≈ {fmtEur(Math.round((d.currency === "USD" ? d.monthlyValue * usdRate : d.monthlyValue) * meta.kans))}
                  </span>
                )}
                {isOpen && d.monthlyValue > 0 && (
                  <button onClick={() => toClient(d)} disabled={pending} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-[12px] px-2.5 py-1 transition-colors disabled:opacity-50">
                    Gewonnen
                  </button>
                )}
                <button onClick={() => remove(d.id)} disabled={pending} className="text-muted/50 hover:text-red-400 text-[13px] px-1 transition-colors disabled:opacity-50" title="Verwijderen">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">{edit.id ? edit.name : "Nieuwe deal"}</h3>
            <div className="space-y-3.5">
              <label className="block">
                <span className={label}>Naam</span>
                <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Bedrijf of persoon" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Per maand</span>
                  <input
                    value={edit.monthlyValue ?? ""}
                    onChange={(e) => setEdit({ ...edit, monthlyValue: Number(e.target.value) })}
                    type="number"
                    placeholder="4000"
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Valuta</span>
                  <select value={edit.currency ?? "EUR"} onChange={(e) => setEdit({ ...edit, currency: e.target.value })} className={field}>
                    <option value="EUR" className="bg-card">€ EUR</option>
                    <option value="USD" className="bg-card">$ USD</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={label}>Fase</span>
                <select value={edit.stage ?? "gesprek"} onChange={(e) => setEdit({ ...edit, stage: e.target.value as DealStage })} className={field}>
                  {(Object.keys(DEAL_META) as DealStage[]).map((s) => (
                    <option key={s} value={s} className="bg-card">
                      {DEAL_META[s].label} ({Math.round(DEAL_META[s].kans * 100)}%)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Start vanaf</span>
                <input value={edit.startsMonth ?? nextMonth} onChange={(e) => setEdit({ ...edit, startsMonth: e.target.value })} type="month" className={field} />
              </label>
              <label className="block">
                <span className={label}>Notitie</span>
                <input value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Wat is de volgende stap?" className={field} />
              </label>
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
