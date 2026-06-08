"use client";

import { useActionState, useEffect, useState } from "react";
import { createClientAction, type ActionResult } from "./actions";
import { icons } from "../_components";

const initial: ActionResult = {};

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createClientAction, initial);

  // Sluit kort na succes.
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
        {icons.plus} Klant toevoegen
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
            <h3 className="font-display font-extrabold text-xl mb-1">Nieuwe klant</h3>
            <p className="text-muted text-sm mb-5">
              Voeg een klant toe. Vul de Instagram-handle in om straks te kunnen syncen.
            </p>

            <form action={action} className="space-y-3.5">
              <Field name="name" label="Naam" placeholder="Lars Vermeer" required />
              <Field name="ig_handle" label="Instagram-handle" placeholder="@larsbuilds" />
              <Field name="contact_email" label="Contact-e-mail (voor meldingen)" type="email" placeholder="lars@bedrijf.nl" />
              <Field name="monthly_value" label="Retainer per maand (€)" type="number" placeholder="2500" />

              {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
              {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

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
                  {pending ? "Bezig…" : "Toevoegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors"
      />
    </label>
  );
}
