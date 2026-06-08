"use client";

import { useActionState, useEffect, useState } from "react";
import { createCaptureAction, type CaptureResult } from "./actions";
import { icons } from "../_components";

const initial: CaptureResult = {};

export function AddCaptureDialog({ boards }: { boards: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCaptureAction, initial);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors">
        {icons.plus} Toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Op een board zetten</h3>
            <p className="text-muted text-sm mb-5">Bewaar een link, notitie of idee in je second brain.</p>

            <form action={action} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Board</span>
                  <input name="board" list="boards" defaultValue={boards[0] ?? "Swipe file"} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40" />
                  <datalist id="boards">
                    {boards.map((b) => <option key={b} value={b} />)}
                  </datalist>
                </label>
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Type</span>
                  <select name="kind" defaultValue="link" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
                    <option value="link" className="bg-card">Link</option>
                    <option value="note" className="bg-card">Notitie</option>
                    <option value="idea" className="bg-card">Idee</option>
                  </select>
                </label>
              </div>
              <Field name="title" label="Titel" placeholder="Wat wil je onthouden?" required />
              <Field name="url" label="Link (optioneel)" placeholder="https://…" />
              <label className="block">
                <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Notitie (optioneel)</span>
                <textarea name="body" rows={2} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-none" />
              </label>

              {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
              {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Annuleren</button>
                <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">{pending ? "Bezig…" : "Bewaren"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input name={name} placeholder={placeholder} required={required} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors" />
    </label>
  );
}
