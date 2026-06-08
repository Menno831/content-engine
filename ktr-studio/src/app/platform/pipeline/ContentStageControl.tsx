"use client";

import { useTransition } from "react";
import { updateContentStageAction } from "./actions";
import { stageMeta, type PipelineStage } from "../_data";

const ORDER: PipelineStage[] = [
  "ideation",
  "ready_for_editing",
  "quality_control",
  "revisions_needed",
  "revisions_completed",
  "client_approval",
  "ready_for_posting",
  "posted",
];

export function ContentStageControl({ contentId, stage }: { contentId: string; stage: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={stage}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateContentStageAction(contentId, e.target.value);
        })
      }
      className="w-full mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[11px] outline-none focus:border-accent/40 disabled:opacity-50 cursor-pointer"
      title="Verplaats naar fase"
    >
      {ORDER.map((s) => (
        <option key={s} value={s} className="bg-card">
          → {stageMeta[s].label}
        </option>
      ))}
    </select>
  );
}
