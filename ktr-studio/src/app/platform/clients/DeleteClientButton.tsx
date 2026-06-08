"use client";

import { useState, useTransition } from "react";
import { deleteClientAction } from "./actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteClientAction(clientId);
      // Bij succes navigeert de server-action weg; alleen fouten komen terug.
      if (r?.error) setError(r.error);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-400/20 text-red-300 hover:bg-red-400/10 px-3 py-1.5 text-[13px] transition-all"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
        Verwijderen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-lg mb-1">Klant verwijderen?</h3>
            <p className="text-muted text-sm mb-5">
              <strong>{clientName}</strong> en alle bijbehorende content, leads en koppelingen worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.
            </p>
            {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                Annuleren
              </button>
              <button
                onClick={confirmDelete}
                disabled={pending}
                className="flex-1 rounded-xl bg-red-500/90 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm py-2.5 transition-colors"
              >
                {pending ? "Bezig…" : "Definitief verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
