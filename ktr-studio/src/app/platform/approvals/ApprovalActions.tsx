"use client";

import { useState, useTransition } from "react";
import { approveContentAction, requestRevisionAction } from "./actions";

export function ApprovalActions({ contentId }: { contentId: string }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "revise">("idle");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function approve() {
    setMsg(null);
    startTransition(async () => {
      const r = await approveContentAction(contentId);
      setMsg(r.ok ? "Goedgekeurd ✓" : r.error ?? "fout");
    });
  }

  function revise() {
    setMsg(null);
    startTransition(async () => {
      const r = await requestRevisionAction(contentId, note);
      setMsg(r.ok ? "Revisie aangevraagd" : r.error ?? "fout");
      if (r.ok) setMode("idle");
    });
  }

  if (msg) return <p className="text-[12px] text-emerald-400">{msg}</p>;

  if (mode === "revise") {
    return (
      <div className="space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Wat moet er anders?"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none"
        />
        <div className="flex gap-2">
          <button onClick={() => setMode("idle")} className="flex-1 rounded-lg border border-white/[0.08] hover:border-white/20 py-2 text-[13px] transition-colors">Terug</button>
          <button onClick={revise} disabled={pending} className="flex-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 disabled:opacity-60 text-background font-bold py-2 text-[13px] transition-colors">{pending ? "…" : "Verstuur revisie"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => setMode("revise")} disabled={pending} className="flex-1 rounded-lg border border-white/[0.08] hover:border-amber-400/40 hover:text-amber-300 py-2 text-[13px] transition-all">Revisie</button>
      <button onClick={approve} disabled={pending} className="flex-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-60 text-background font-bold py-2 text-[13px] transition-colors">{pending ? "…" : "Goedkeuren"}</button>
    </div>
  );
}
