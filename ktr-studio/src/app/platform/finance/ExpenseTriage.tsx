"use client";

// ════════════════════════════════════════════════════════════════
// Uitgaven-triage: bankmutaties (via Moneybird, alleen-lezen) die
// nog geen label hebben. Menno loopt ze wekelijks langs en hangt ze
// aan een klant, vaste lasten, privé of overig — daarna weet het
// dashboard waar het geld heen ging.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtEur } from "../_data";
import { linkExpenseAction } from "./actions";

export interface TriageMutation {
  id: string;
  date: string | null;
  amount: number; // negatief
  party: string;
  description: string;
}

export function ExpenseTriage({
  unlabeled,
  totals,
  clients,
}: {
  unlabeled: TriageMutation[];
  totals: { kind: string; total: number }[];
  clients: { id: string; label: string }[];
}) {
  const [queue, setQueue] = useState(unlabeled);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  function label(m: TriageMutation, value: string) {
    if (!value) return;
    const [kind, clientId] = value.split(":");
    setError(null);
    start(async () => {
      const r = await linkExpenseAction({
        mutationId: m.id,
        kind,
        clientId: clientId || null,
        label: m.party,
        amount: m.amount,
        date: m.date,
      });
      if (!r.ok) setError(r.error ?? "Opslaan mislukt.");
      else setQueue((q) => q.filter((x) => x.id !== m.id));
    });
  }

  const kindLabel: Record<string, string> = { klant: "Klantkosten", vast: "Vaste lasten", prive: "Privé", overig: "Overig" };
  const shown = showAll ? queue : queue.slice(0, 8);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <Eyebrow>Bank · via Moneybird</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Uitgaven</h2>
        </div>
        {queue.length > 0 && (
          <span className="font-mono text-[12px] text-amber-300">{queue.length} nog te labelen</span>
        )}
      </div>

      {totals.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[12px] text-muted">
          {totals.map((t) => (
            <span key={t.kind}>
              {kindLabel[t.kind] ?? t.kind}: <strong className="font-mono text-foreground/85">{fmtEur(Math.round(Math.abs(t.total)))}</strong>
            </span>
          ))}
        </div>
      )}

      {queue.length === 0 ? (
        <p className="text-[13px] text-muted">Alles gelabeld — niks te doen. ✓</p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{m.party}</div>
                <div className="text-[11px] text-muted truncate">
                  {m.date ? new Date(m.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "—"}
                  {m.description ? ` · ${m.description}` : ""}
                </div>
              </div>
              <span className="font-mono text-sm text-red-400 shrink-0">{fmtEur(Math.round(m.amount))}</span>
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => label(m, e.target.value)}
                className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[12px] outline-none focus:border-accent/40"
              >
                <option value="" className="bg-card">Label…</option>
                {clients.map((cl) => (
                  <option key={cl.id} value={`klant:${cl.id}`} className="bg-card">→ {cl.label}</option>
                ))}
                <option value="vast:" className="bg-card">Vaste last</option>
                <option value="prive:" className="bg-card">Privé</option>
                <option value="overig:" className="bg-card">Overig</option>
              </select>
            </div>
          ))}
          {queue.length > 8 && (
            <button onClick={() => setShowAll((s) => !s)} className="w-full text-center text-[12px] text-muted hover:text-accent py-1.5 transition-colors">
              {showAll ? "Minder tonen" : `+${queue.length - 8} meer tonen`}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red-400">{error}</p>}
    </Card>
  );
}
