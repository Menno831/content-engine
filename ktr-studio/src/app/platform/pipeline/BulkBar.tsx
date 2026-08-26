"use client";

// ════════════════════════════════════════════════════════════════
// Zwevende balk onderin zodra er kaarten aangevinkt zijn: alles in
// één keer naar een andere fase, of in bulk verwijderen (niet voor
// editors). Verwijderen vraagt één extra klik ter bevestiging.
// ════════════════════════════════════════════════════════════════

import { useState, useSyncExternalStore, useTransition } from "react";
import { stageMeta, type PipelineStage } from "../_data";
import { selection } from "./selection";
import { bulkStageAction, bulkDeleteAction, bulkEditorAction } from "./actions";

const STAGES: PipelineStage[] = [
  "ideation",
  "ready_for_editing",
  "quality_control",
  "revisions_needed",
  "revisions_completed",
  "client_approval",
  "ready_for_posting",
  "posted",
];

export function BulkBar({ isEditor, editors = [] }: { isEditor: boolean; editors?: { id: string; label: string }[] }) {
  const count = useSyncExternalStore(selection.subscribe, selection.count, () => 0);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  function move(stage: string) {
    if (!stage) return;
    setError(null);
    start(async () => {
      const r = await bulkStageAction(selection.ids(), stage);
      if (r.error) setError(r.error);
      else selection.clear();
    });
  }

  function assign(editorId: string) {
    setError(null);
    start(async () => {
      const r = await bulkEditorAction(selection.ids(), editorId === "__none" ? null : editorId);
      if (r.error) setError(r.error);
      else selection.clear();
    });
  }

  function doDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    start(async () => {
      const r = await bulkDeleteAction(selection.ids());
      if (r.error) setError(r.error);
      else selection.clear();
      setConfirmDelete(false);
    });
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-accent/30 bg-card/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/50">
        <span className="font-mono text-[12px] text-accent font-bold shrink-0">
          {count} selected
        </span>

        <select
          value=""
          disabled={pending}
          onChange={(e) => move(e.target.value)}
          className="flex-1 min-w-[150px] rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[13px] outline-none focus:border-accent/40"
        >
          <option value="" className="bg-card">
            {pending ? "Working…" : "Move to…"}
          </option>
          {STAGES.map((s) => (
            <option key={s} value={s} className="bg-card">
              {stageMeta[s].label}
            </option>
          ))}
        </select>

        {!isEditor && editors.length > 0 && (
          <select
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && assign(e.target.value)}
            className="flex-1 min-w-[130px] rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[13px] outline-none focus:border-accent/40"
          >
            <option value="" className="bg-card">Assign to…</option>
            {editors.map((ed) => (
              <option key={ed.id} value={ed.id} className="bg-card">{ed.label}</option>
            ))}
            <option value="__none" className="bg-card">— niemand</option>
          </select>
        )}

        {!isEditor && (
          <button
            onClick={doDelete}
            disabled={pending}
            className={`shrink-0 rounded-xl border px-3 py-2 text-[13px] transition-colors ${
              confirmDelete
                ? "border-red-500/60 bg-red-500/10 text-red-400 font-bold"
                : "border-white/[0.1] text-muted hover:border-red-500/40 hover:text-red-400"
            }`}
          >
            {confirmDelete ? "Sure? Click again" : "🗑 Delete"}
          </button>
        )}

        <button
          onClick={() => {
            selection.clear();
            setConfirmDelete(false);
            setError(null);
          }}
          className="shrink-0 rounded-xl border border-white/[0.1] px-3 py-2 text-[13px] text-muted hover:border-white/25 transition-colors"
          title="Clear selection"
        >
          ✕
        </button>

        {error && <p className="w-full text-[12px] text-red-400">{error}</p>}
      </div>
    </div>
  );
}
