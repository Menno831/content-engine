"use client";

// Kosten-breakdown per factuur: klik op de kosten/winst van een
// factuurregel en vul per post in wat het kostte (edits, thumbnails,
// postkosten...). De som is de factuurkosten; winst = excl. btw − som.

import { useState, useTransition } from "react";
import { setInvoiceCostAction, type CostLine } from "./actions";
import { fmtEur } from "../_data";

const PRESETS = ["Edits", "Thumbnails", "Postkosten"];

export function InvoiceCost({
  invoiceId,
  invoiceLabel,
  totalExcl,
  initialCost,
  initialBreakdown,
}: {
  invoiceId: string;
  invoiceLabel: string;
  totalExcl: number;
  initialCost: number;
  initialBreakdown: CostLine[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<CostLine[]>(
    initialBreakdown?.length
      ? initialBreakdown
      : initialCost
        ? [{ label: "Kosten", amount: initialCost }]
        : PRESETS.map((label) => ({ label, amount: 0 }))
  );
  const [savedTotal, setSavedTotal] = useState(initialCost);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const profit = totalExcl - savedTotal;

  function patchLine(i: number, p: Partial<CostLine>) {
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...p } : l)));
  }

  function save() {
    start(async () => {
      const r = await setInvoiceCostAction(invoiceId, total, lines);
      if (r.error) setError(r.error);
      else {
        setError("");
        setSavedTotal(total);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-white/[0.08] hover:border-accent/30 px-2.5 py-1 transition-all shrink-0"
        title="Klik voor de kosten-breakdown van deze factuur"
      >
        <span className="text-[12px] text-muted">kosten {fmtEur(savedTotal)}</span>
        <span className={`font-mono text-[12px] ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>winst {fmtEur(profit)}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Kosten-breakdown</h3>
            <p className="text-muted text-sm mb-4 truncate">{invoiceLabel} · factuur {fmtEur(totalExcl)} excl. btw</p>

            <div className="space-y-2 mb-3">
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => patchLine(i, { label: e.target.value })}
                    placeholder="Bijv. edits"
                    className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
                  />
                  <input
                    value={l.amount || ""}
                    onChange={(e) => patchLine(i, { amount: Number(e.target.value) || 0 })}
                    type="number"
                    placeholder="€"
                    className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-right outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setLines((cur) => cur.filter((_, idx) => idx !== i))}
                    className="text-[13px] text-muted hover:text-red-400 px-1 transition-colors"
                    title="Regel weg"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLines((cur) => [...cur, { label: "", amount: 0 }])}
              className="text-[12.5px] text-accent hover:text-accent-hover mb-4 transition-colors"
            >
              + Regel toevoegen
            </button>

            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 mb-4 text-sm">
              <span className="text-muted">Totale kosten</span>
              <span className="font-mono">{fmtEur(total)}</span>
            </div>
            <div className="flex items-center justify-between px-4 mb-4 text-sm">
              <span className="text-muted">Winst op deze factuur</span>
              <span className={`font-mono font-bold ${totalExcl - total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtEur(totalExcl - total)}
              </span>
            </div>

            {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                Annuleren
              </button>
              <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                {pending ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
