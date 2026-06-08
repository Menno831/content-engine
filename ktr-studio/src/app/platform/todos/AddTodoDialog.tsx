"use client";

import { useActionState, useEffect, useState } from "react";
import { createTodoAction, type TodoActionResult } from "./actions";
import { icons } from "../_components";

const initial: TodoActionResult = {};

export function AddTodoDialog({ clients }: { clients: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTodoAction, initial);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
      >
        {icons.plus} Taak voor klant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Nieuwe taak</h3>
            <p className="text-muted text-sm mb-5">De klant krijgt automatisch een melding (en e-mail als er een adres bekend is).</p>

            {clients.length === 0 ? (
              <p className="text-[13px] text-amber-300">Voeg eerst een klant toe.</p>
            ) : (
              <form action={action} className="space-y-3.5">
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Klant</span>
                  <select name="client_id" required defaultValue="" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
                    <option value="" disabled className="bg-card">Kies…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Omschrijving</span>
                  <input name="title" required placeholder="Lever 3 ruwe clips aan" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40" />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Deadline (optioneel)</span>
                  <input name="due" type="date" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40" />
                </label>

                {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
                {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Annuleren</button>
                  <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">{pending ? "Bezig…" : "Toevoegen"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
