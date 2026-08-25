"use client";

// ════════════════════════════════════════════════════════════════
// DM-sprint: de verzendlopende band. Alles staat klaar (AI-opener,
// profiel-link, klembord) — alleen het daadwerkelijke versturen
// blijft een menselijke klik in Instagram zelf. Twee handelingen
// per prospect: [1] opent de DM met het bericht op je klembord,
// [2] plakken + versturen in IG, hier "Verstuurd" klikken → de
// kaart schuift naar 'DM verstuurd' en de volgende staat klaar.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { updateProspectStageAction } from "./actions";

export interface SprintItem {
  id: string;
  name: string;
  handle: string;
  message: string;
  top: boolean;
}

export function SprintMode({ items }: { items: SprintItem[] }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState(items);
  const [sent, setSent] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const cur = queue[0];

  function openDm() {
    if (!cur) return;
    window.open(`https://ig.me/m/${cur.handle}`, "_blank", "noopener");
    navigator.clipboard.writeText(cur.message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    }).catch(() => undefined);
  }

  function next() {
    setQueue((q) => q.slice(1));
    setCopied(false);
  }

  function markSent() {
    if (!cur) return;
    start(async () => {
      await updateProspectStageAction(cur.id, "dm_verstuurd");
      setSent((s) => s + 1);
      next();
    });
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent hover:bg-accent-hover text-background font-bold px-3.5 py-1.5 text-[12px] transition-colors"
      >
        🚀 DM-sprint ({items.length} klaar)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-xl">DM-sprint</h3>
              <span className="font-mono text-[12px] text-muted">
                nog {queue.length} · verstuurd {sent}
              </span>
            </div>

            {!cur ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎉</div>
                <p className="font-display font-bold mb-1">Sprint klaar</p>
                <p className="text-[13px] text-muted">{sent} DM{sent === 1 ? "" : "'s"} verstuurd — de kaarten staan op &lsquo;DM verstuurd&rsquo;.</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="font-medium">
                    {cur.top && <span className="text-amber-300 mr-1">★</span>}
                    {cur.name} <span className="text-muted text-[13px]">@{cur.handle}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 mb-4 text-[13.5px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {cur.message}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={openDm}
                    className="w-full rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm py-3 transition-colors"
                  >
                    {copied ? "✓ Bericht op je klembord — plak & verstuur in IG" : "1 · Open DM + kopieer bericht"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={markSent}
                      disabled={pending}
                      className="flex-1 rounded-xl border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50 font-bold text-sm py-2.5 transition-colors"
                    >
                      2 · Verstuurd → volgende
                    </button>
                    <button
                      onClick={next}
                      className="shrink-0 rounded-xl border border-white/[0.08] text-muted hover:border-white/20 px-4 py-2.5 text-sm transition-colors"
                    >
                      Overslaan
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-white/[0.08] hover:border-white/20 py-2 text-[13px] text-muted transition-colors"
            >
              Sluiten (voortgang blijft bewaard)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
