"use client";

import { useState, useTransition } from "react";
import { updatePaymentStatusAction } from "./actions";

const OPTIONS = [
  { value: "betaald", label: "Betaald" },
  { value: "open", label: "Open" },
  { value: "te_laat", label: "Te laat" },
];

const color: Record<string, string> = {
  betaald: "#34D399",
  open: "#FBBF24",
  te_laat: "#F87171",
};

export function PaymentStatusControl({ clientId, status }: { clientId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          const r = await updatePaymentStatusAction(clientId, next);
          if (!r.ok) setValue(status);
        });
      }}
      className="rounded-lg border bg-white/[0.02] px-2.5 py-1 text-[12px] outline-none disabled:opacity-50 cursor-pointer"
      style={{ color: color[value], borderColor: `${color[value]}55` }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="bg-card text-foreground">
          {o.label}
        </option>
      ))}
    </select>
  );
}
