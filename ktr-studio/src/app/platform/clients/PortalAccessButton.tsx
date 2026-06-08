"use client";

import { useActionState, useState } from "react";
import { grantPortalAccessAction, type PortalResult } from "./actions";

const initial: PortalResult = {};

export function PortalAccessButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(grantPortalAccessAction, initial);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] transition-all"
        title="Portaal-login aanmaken"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" />
        </svg>
        Portaal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-extrabold text-xl mb-1">Portaaltoegang — {clientName}</h3>
            <p className="text-muted text-sm mb-5">
              Maak een login waarmee {clientName} alleen z'n eigen content, prestaties en rapporten ziet.
            </p>

            {state.ok && state.password ? (
              <div className="space-y-4">
                <p className="text-[13px] text-emerald-400">{state.ok}</p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                  <p className="text-[12px] text-muted">
                    Geef deze gegevens door aan de klant. Het wachtwoord zie je nu <span className="text-foreground">één keer</span>.
                  </p>
                  <Row label="E-mail" value={state.email ?? ""} />
                  <Row label="Wachtwoord" value={state.password} />
                  <p className="text-[11px] text-muted">Inloggen kan op deze zelfde site via /login.</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm py-2.5 transition-colors"
                >
                  Klaar
                </button>
              </div>
            ) : (
              <form action={action} className="space-y-3.5">
                <input type="hidden" name="client_id" value={clientId} />
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">
                    E-mail van de klant
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="klant@bedrijf.nl"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors"
                  />
                </label>

                {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors"
                  >
                    {pending ? "Bezig…" : "Toegang aanmaken"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-mono uppercase tracking-wider text-muted">{label}</span>
      <code className="text-[13px] text-foreground bg-black/30 rounded-lg px-2.5 py-1 border border-white/[0.06] truncate">
        {value}
      </code>
    </div>
  );
}
