"use client";

// ════════════════════════════════════════════════════════════════
// Snel een taak toevoegen zonder dialoog: één regel bovenaan de
// takenpagina — omschrijving typen, klant kiezen, Enter. Het formulier
// leegt zichzelf na toevoegen zodat je direct de volgende kunt typen.
// ════════════════════════════════════════════════════════════════

import { useActionState, useEffect, useRef } from "react";
import { createTodoAction, type TodoActionResult } from "./actions";

const initial: TodoActionResult = {};

export function QuickAddTodo({ clients }: { clients: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(createTodoAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) {
      const clientValue = (formRef.current.elements.namedItem("client_id") as HTMLSelectElement | null)?.value;
      formRef.current.reset();
      // Klantkeuze bewaren: vaak voeg je meerdere taken voor dezelfde klant toe.
      if (clientValue) {
        const sel = formRef.current.elements.namedItem("client_id") as HTMLSelectElement | null;
        if (sel) sel.value = clientValue;
      }
      inputRef.current?.focus();
    }
  }, [state]);

  if (clients.length === 0) return null;

  return (
    <form ref={formRef} action={action} className="mb-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card border border-white/[0.07] p-2.5">
        <input
          ref={inputRef}
          name="title"
          required
          placeholder="Nieuwe taak — typ en druk op Enter…"
          className="flex-1 min-w-[200px] rounded-xl bg-white/[0.02] border border-white/[0.06] px-3.5 py-2 text-sm outline-none focus:border-accent/40 transition-colors"
        />
        <select
          name="client_id"
          required
          defaultValue={clients.length === 1 ? clients[0].id : ""}
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-[13px] outline-none focus:border-accent/40"
        >
          <option value="" disabled className="bg-card">
            Klant…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-card">
              {c.label}
            </option>
          ))}
        </select>
        <input
          name="due"
          type="date"
          className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-[13px] text-muted outline-none focus:border-accent/40"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2 transition-colors"
        >
          {pending ? "…" : "+ Taak"}
        </button>
      </div>
      {state.error && <p className="mt-1.5 text-[12px] text-red-400">{state.error}</p>}
    </form>
  );
}
