"use client";

import { useTransition } from "react";
import { updateLeadStageAction } from "./actions";

const STAGES: { value: string; label: string }[] = [
  { value: "nieuw", label: "Nieuwe lead" },
  { value: "gekwalificeerd", label: "Gekwalificeerd" },
  { value: "call_gepland", label: "Call gepland" },
  { value: "closed", label: "Closed" },
  { value: "verloren", label: "Verloren" },
];

export function LeadStageControl({ leadId, stage }: { leadId: string; stage: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={stage}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateLeadStageAction(leadId, e.target.value);
        })
      }
      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[11px] outline-none focus:border-accent/40 disabled:opacity-50 cursor-pointer"
      title="Verplaats naar fase"
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value} className="bg-card">
          → {s.label}
        </option>
      ))}
    </select>
  );
}
