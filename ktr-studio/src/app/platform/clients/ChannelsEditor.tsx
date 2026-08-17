"use client";

// Kanalen bewerken op het klantprofiel: Instagram-handle + YouTube-kanaal.
// Deze sturen de 3x-daagse sync aan — daarom prominent op het profiel.
import { useState, useTransition } from "react";
import { updateClientChannelsAction } from "./actions";

export function ChannelsEditor({
  clientId,
  igHandle,
  ytChannel,
}: {
  clientId: string;
  igHandle: string;
  ytChannel: string;
}) {
  const [ig, setIg] = useState(igHandle);
  const [yt, setYt] = useState(ytChannel);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateClientChannelsAction(clientId, ig, yt);
      setMsg(r.ok ? { ok: true, text: "Kanalen opgeslagen — klik nu op Sync." } : { ok: false, text: r.error ?? "Opslaan mislukt." });
    });
  }

  return (
    <div className="mt-5 pt-4 border-t border-white/[0.06]">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
        Kanalen (voor de automatische sync)
      </div>
      <div className="space-y-2">
        <label className="block">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Instagram-handle</span>
          <input
            value={ig}
            onChange={(e) => setIg(e.target.value)}
            placeholder="@handle"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">YouTube (kanaal-id of @handle)</span>
          <input
            value={yt}
            onChange={(e) => setYt(e.target.value)}
            placeholder="@handle of UC…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
        <button
          onClick={save}
          disabled={pending}
          className="w-full rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-[13px] py-2 transition-colors"
        >
          {pending ? "Opslaan…" : "Kanalen opslaan"}
        </button>
        {msg && <p className={`text-[12px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
