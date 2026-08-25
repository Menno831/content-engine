"use client";

import { useTransition } from "react";
import { updateProspectStageAction } from "./actions";
import { prospectStageMeta, type ProspectStage } from "../_data";

const ORDER: ProspectStage[] = ["te_contacteren", "dm_verstuurd", "in_gesprek", "audit_verstuurd", "geen_reactie", "afgekeurd"];

export function ProspectStageControl({ prospectId, stage }: { prospectId: string; stage: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={stage}
      disabled={pending}
      onChange={(e) => startTransition(async () => { await updateProspectStageAction(prospectId, e.target.value); })}
      className="w-full mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[11px] outline-none focus:border-accent/40 disabled:opacity-50 cursor-pointer"
    >
      {ORDER.map((s) => (
        <option key={s} value={s} className="bg-card">→ {prospectStageMeta[s].label}</option>
      ))}
    </select>
  );
}
