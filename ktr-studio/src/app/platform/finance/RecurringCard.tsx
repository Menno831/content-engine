"use client";

// Terugkerende afschrijvingen die nog niet als vaste last staan. Eén
// klik zet 'm erbij én labelt de mutaties, zodat de winst per maand
// meteen klopt zonder dat je elke afschrijving apart moet aanwijzen.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtEur } from "../_data";
import { adoptFixedCostAction } from "./actions";
import type { RecurringSuggestion } from "@/lib/recurring";

export function RecurringCard({ suggestions }: { suggestions: RecurringSuggestion[] }) {
  const [list, setList] = useState(suggestions);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (list.length === 0) return null;

  function adopt(s: RecurringSuggestion) {
    setError(null);
    start(async () => {
      const r = await adoptFixedCostAction({ name: s.party, amount: s.amount, mutationIds: s.mutationIds, dates: s.dates });
      if (r.error) setError(r.error);
      else setList((cur) => cur.filter((x) => x.party !== s.party));
    });
  }

  const total = list.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Card id="vast" className="p-6 mb-6 border-amber-300/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <Eyebrow>Uit je bank</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Dit ziet eruit als vaste lasten</h2>
        </div>
        <span className="text-sm"><span className="text-muted text-[12px]">Samen ± </span><strong className="font-mono">{fmtEur(total)}</strong><span className="text-muted text-[12px]"> per maand</span></span>
      </div>
      <p className="text-[13px] text-muted mb-4">
        Afschrijvingen die elke maand terugkomen op ABN of Revolut, met hetzelfde bedrag. Zet ze erbij en ze tellen mee in je winst.
      </p>
      {error && <p className="text-[13px] text-red-400 mb-2">{error}</p>}
      <div className="space-y-1">
        {list.map((s) => (
          <div key={s.party} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.party}</div>
              <div className="text-[11px] text-muted">
                {s.months.length}× gezien ({s.months.map((m) => new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" })).join(", ")})
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm">{fmtEur(s.amount)}</span>
              <button
                onClick={() => adopt(s)}
                disabled={pending}
                className="rounded-lg bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent font-bold text-[12px] px-2.5 py-1.5 disabled:opacity-50 transition-colors"
              >
                Zet als vaste last
              </button>
              <button
                onClick={() => setList((cur) => cur.filter((x) => x.party !== s.party))}
                className="rounded-lg border border-white/[0.08] hover:border-white/20 text-[12px] px-2.5 py-1.5 text-muted transition-all"
                title="Niet nu"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
