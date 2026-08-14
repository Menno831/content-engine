"use client";

import { useActionState, useEffect, useState } from "react";
import { createContentAction, type ContentActionResult } from "./actions";
import { stageMeta, type PipelineStage } from "../_data";
import { icons } from "../_components";

const initial: ContentActionResult = {};
const STAGE_ORDER: PipelineStage[] = [
  "ideation",
  "ready_for_editing",
  "quality_control",
  "revisions_needed",
  "revisions_completed",
  "client_approval",
  "ready_for_posting",
  "posted",
];
const FORMATS = ["Reel", "Carrousel", "Story", "Short"];

interface Option {
  id: string;
  label: string;
}

export function AddContentDialog({ clients, editors }: { clients: Option[]; editors: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createContentAction, initial);

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
        {icons.plus} Kaart toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Nieuwe content</h3>
            <p className="text-muted text-sm mb-5">Bij &ldquo;Ideation&rdquo; krijgt de klant automatisch een melding.</p>

            {clients.length === 0 ? (
              <p className="text-[13px] text-amber-300">Voeg eerst een klant toe.</p>
            ) : (
              <form action={action} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Select name="client_id" label="Klant" options={clients} required />
                  <Select name="stage" label="Fase" options={STAGE_ORDER.map((s) => ({ id: s, label: stageMeta[s].label }))} />
                </div>
                <Field name="title" label="Titel" placeholder="Klant-resultaat reveal" required />
                <Field name="hook" label="Hook" placeholder="0 → 300 leden in 90 dagen" />
                <div className="grid grid-cols-2 gap-3">
                  <Select name="format" label="Format" options={FORMATS.map((f) => ({ id: f, label: f }))} />
                  <Field name="content_type" label="Type" placeholder="Talking head / B-roll" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="deadline" label="Deadline" type="date" />
                  <Select name="editor_id" label="Editor" options={editors} placeholder="— geen —" />
                </div>
                <Field name="brief_url" label="Files-link (Frame.io / Drive)" placeholder="https://f.io/… — waar de editor het materiaal vindt" />

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

function Field({ name, label, type = "text", placeholder, required }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors" />
    </label>
  );
}

function Select({ name, label, options, placeholder, required }: { name: string; label: string; options: Option[]; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <select name={name} required={required} defaultValue={placeholder !== undefined ? "" : options[0]?.id ?? ""} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
        {placeholder !== undefined && <option value="" className="bg-card">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-card">{o.label}</option>
        ))}
      </select>
    </label>
  );
}
