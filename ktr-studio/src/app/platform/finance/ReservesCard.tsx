"use client";

// ════════════════════════════════════════════════════════════════
// Potjes: hoeveel er van de maandwinst opzij zou gaan volgens de
// percentages die MENNO ZELF instelt (belasting / buffer / vrij te
// besteden). De btw is geen keuze maar administratie: dat geld is
// van de Belastingdienst en staat er altijd bij. Dit is rekentooling,
// géén financieel advies — de percentages en keuzes zijn aan Menno.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtEur } from "../_data";
import { saveReserveConfigAction } from "./actions";

export interface ReserveConfig {
  belasting: number;
  buffer: number;
  beleggen: number;
}

export function ReservesCard({
  vatThisQuarter,
  profitThisMonth,
  config,
}: {
  vatThisQuarter: number;
  profitThisMonth: number;
  config: ReserveConfig | null;
}) {
  const [edit, setEdit] = useState(false);
  const [c, setC] = useState<ReserveConfig>(config ?? { belasting: 0, buffer: 0, beleggen: 0 });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasConfig = config && (config.belasting > 0 || config.buffer > 0 || config.beleggen > 0);
  const base = Math.max(0, profitThisMonth);
  const rows = hasConfig
    ? [
        { label: "Belastingreservering", pct: config!.belasting },
        { label: "Buffer / sparen", pct: config!.buffer },
        { label: "Vrij te besteden potje", pct: config!.beleggen },
      ].filter((r) => r.pct > 0)
    : [];

  function save() {
    start(async () => {
      const r = await saveReserveConfigAction(c);
      if (!r.ok) setError(r.error ?? "Opslaan mislukt.");
      else setEdit(false);
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <Eyebrow>Opzij zetten</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Potjes</h2>
        </div>
        <button onClick={() => setEdit((e) => !e)} className="text-[12px] text-accent hover:text-accent-hover">
          {edit ? "Sluiten" : "⚙ Percentages"}
        </button>
      </div>

      <div className="space-y-2 mt-3">
        <div className="flex items-center justify-between rounded-xl bg-amber-400/[0.06] border border-amber-400/20 px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">Btw dit kwartaal</div>
            <div className="text-[11px] text-muted">Ontvangen btw op betaalde facturen — dit is niet van jou</div>
          </div>
          <span className="font-mono text-sm text-amber-300">{fmtEur(Math.round(vatThisQuarter))}</span>
        </div>

        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">{r.label}</div>
              <div className="text-[11px] text-muted">{r.pct}% van de maandwinst ({fmtEur(base)})</div>
            </div>
            <span className="font-mono text-sm">{fmtEur(Math.round((base * r.pct) / 100))}</span>
          </div>
        ))}

        {!hasConfig && !edit && (
          <p className="text-[12.5px] text-muted">
            Stel via ⚙ je eigen percentages in (bv. voor inkomstenbelasting en buffer) — dan rekent dit blok elke maand
            voor je uit wat er opzij zou gaan. Welke percentages passen is aan jou (of je boekhouder); dit is rekentooling, geen advies.
          </p>
        )}
      </div>

      {edit && (
        <div className="mt-4 rounded-xl border border-white/[0.08] p-3.5 space-y-3">
          {([
            ["belasting", "Belastingreservering %"],
            ["buffer", "Buffer / sparen %"],
            ["beleggen", "Vrij te besteden potje %"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3">
              <span className="text-[13px]">{label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={c[key]}
                onChange={(e) => setC({ ...c, [key]: Number(e.target.value) })}
                className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-sm text-right outline-none focus:border-accent/40"
              />
            </label>
          ))}
          {error && <p className="text-[12.5px] text-red-400">{error}</p>}
          <button onClick={save} disabled={pending} className="w-full rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
            {pending ? "Opslaan…" : "Percentages opslaan"}
          </button>
        </div>
      )}
    </Card>
  );
}
