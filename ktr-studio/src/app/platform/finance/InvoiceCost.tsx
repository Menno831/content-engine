"use client";

// Inline kosten per factuur: vul globaal de kosten in (editor, freelancer,
// ads, wat dan ook) en je ziet direct de winst op die factuur.

import { useRef, useState, useTransition } from "react";
import { setInvoiceCostAction } from "./actions";
import { fmtEur } from "../_data";

export function InvoiceCost({
  invoiceId,
  totalExcl,
  initialCost,
}: {
  invoiceId: string;
  totalExcl: number;
  initialCost: number;
}) {
  const [cost, setCost] = useState<string>(initialCost ? String(initialCost) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const num = Number(cost) || 0;
  const profit = totalExcl - num;

  function onChange(v: string) {
    setCost(v);
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      start(async () => {
        const r = await setInvoiceCostAction(invoiceId, Number(v) || 0);
        setState(r.ok ? "saved" : "error");
      });
    }, 700);
  }

  return (
    <span className="flex items-center gap-2 shrink-0">
      <span className="flex items-center gap-1 text-[12px] text-muted">
        <span>kosten €</span>
        <input
          value={cost}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          placeholder="0"
          title="Globale kosten voor deze factuur (editor, freelancers, ads...)"
          className="w-16 rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[12px] text-right outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </span>
      <span
        className={`font-mono text-[12px] ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
        title={state === "error" ? "Opslaan mislukt — draai migratie 023" : "Winst = factuur excl. btw − kosten"}
      >
        winst {fmtEur(profit)}
        {state === "saving" ? " …" : state === "error" ? " ⚠" : ""}
      </span>
    </span>
  );
}
