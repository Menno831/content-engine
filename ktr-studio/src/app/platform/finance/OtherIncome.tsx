"use client";

// Overige inkomsten per maand: geld dat nooit gefactureerd is (bv.
// crypto in jan/feb) maar wel meetelt in de echte maandwinst.

import { useState, useTransition } from "react";
import { addOtherIncomeAction, deleteOtherIncomeAction } from "./actions";
import { fmtEur } from "../_data";

export interface IncomeRow {
  id: string;
  label: string;
  amount: number;
}

export function OtherIncome({ month, initial }: { month: string; initial: IncomeRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const total = rows.reduce((s, r) => s + r.amount, 0);

  function add() {
    if (!label.trim()) return;
    start(async () => {
      const r = await addOtherIncomeAction(month, label, Number(amount) || 0);
      if (r.error) setError(r.error);
      else {
        setError("");
        setRows((cur) => [...cur, { id: `tmp-${cur.length}`, label: label.trim(), amount: Number(amount) || 0 }]);
        setLabel("");
        setAmount("");
      }
    });
  }

  function remove(id: string) {
    setRows((cur) => cur.filter((r) => r.id !== id));
    start(async () => {
      await deleteOtherIncomeAction(id);
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-[13px]">
        <span className="text-muted">
          {open ? "▾" : "▸"} Overige inkomsten (niet gefactureerd, bv. crypto)
        </span>
        <span className="font-mono text-emerald-400">+{fmtEur(total)}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-[13px] group">
              <span className="truncate">{r.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-muted">{fmtEur(r.amount)}</span>
                <button
                  onClick={() => remove(r.id)}
                  disabled={r.id.startsWith("tmp-")}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all disabled:opacity-0"
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
          <div className="flex gap-2 pt-1.5">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Bijv. crypto-betaling klant X"
              className="flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/40"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              type="number"
              placeholder="€"
              className="w-24 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[13px] text-right outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={add}
              disabled={pending || !label.trim()}
              className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-[13px] px-3 py-1.5 transition-colors"
            >
              +
            </button>
          </div>
          {error && <p className="text-[12.5px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
