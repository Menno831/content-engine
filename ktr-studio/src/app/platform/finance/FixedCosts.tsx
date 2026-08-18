"use client";

// Vaste maandlasten van de agency zelf: Claude, bank, Skool, telefoon...
// Simpel lijstje met toevoegen/verwijderen; de som telt mee in het
// maandoverzicht bovenaan Finance.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { addFixedCostAction, deleteFixedCostAction } from "./actions";
import { fmtEur } from "../_data";

export interface FixedCostRow {
  id: string;
  name: string;
  amount: number;
}

export function FixedCosts({ initial }: { initial: FixedCostRow[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const total = rows.reduce((s, r) => s + r.amount, 0);

  function add() {
    if (!name.trim()) return;
    start(async () => {
      const r = await addFixedCostAction(name, Number(amount) || 0);
      if (r.error) setError(r.error);
      else {
        setError("");
        // Herladen via revalidate duurt even; lokaal alvast tonen.
        setRows((cur) => [...cur, { id: `tmp-${cur.length}`, name: name.trim(), amount: Number(amount) || 0 }]);
        setName("");
        setAmount("");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteFixedCostAction(id);
      if (r.error) setError(r.error);
      else setRows((cur) => cur.filter((x) => x.id !== id));
    });
  }

  return (
    <Card className="p-6">
      <Eyebrow>Vaste lasten</Eyebrow>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-extrabold text-xl">Wat er elke maand uitgaat</h2>
        <span className="font-mono text-sm text-red-400">−{fmtEur(total)}/mnd</span>
      </div>

      <div className="space-y-1 mb-4">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
            <span className="text-sm truncate">{r.name}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm text-muted">{fmtEur(r.amount)}</span>
              <button
                onClick={() => remove(r.id)}
                disabled={pending || r.id.startsWith("tmp-")}
                className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all disabled:opacity-0"
                title="Verwijderen"
              >
                ✕
              </button>
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-[13px] text-muted px-3 py-2">
            Nog niks — voeg je vaste lasten toe (Claude, bank, Skool, telefoon...).
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Bijv. Claude"
          className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          type="number"
          placeholder="€/mnd"
          className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-right outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={add}
          disabled={pending || !name.trim()}
          className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-2 transition-colors"
        >
          +
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
    </Card>
  );
}
