"use client";

import { useActionState, useEffect, useState } from "react";
import { bulkCreateContentAction, type ContentActionResult } from "./actions";
import { icons } from "../_components";

const initial: ContentActionResult = {};
const FORMATS = ["Longform", "Clip", "Lifestyle", "VO story", "Talking", "Trio", "Carrousel"];

interface Option {
  id: string;
  label: string;
}

// Bewust Engels: het board is er ook voor de editors — één taal.
// Snelle invoer: één titel per regel, klant/editor/format één keer kiezen.
// De editor krijgt één verzamelmail voor de hele batch.
export function QuickAddDialog({
  clients,
  editors,
  defaultClient,
}: {
  clients: Option[];
  editors: Option[];
  defaultClient?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(bulkCreateContentAction, initial);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 900);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/[0.08] font-bold text-sm px-4 py-2.5 transition-colors"
        title="Add several videos at once — one title per line"
      >
        {icons.plus} Quick add
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Quick add</h3>
            <p className="text-muted text-sm mb-5">
              One title per line. Everything lands in the chosen stage and the editor gets a single email for the whole batch.
            </p>

            {clients.length === 0 ? (
              <p className="text-[13px] text-amber-300">Add a client first.</p>
            ) : (
              <form action={action} className="space-y-3.5">
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Videos — one per line</span>
                  <textarea
                    name="titles"
                    rows={6}
                    required
                    placeholder={"Talking: founder story\nClip from longform week 34\nLifestyle: Budapest b-roll"}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors resize-y"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Select name="client_id" label="Client" options={clients} required defaultValue={defaultClient} />
                  <Select name="editor_id" label="Editor" options={editors} placeholder={editors.length ? "— none —" : "No editors yet"} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select name="format" label="Format" options={FORMATS.map((f) => ({ id: f, label: f }))} />
                  <Select
                    name="stage"
                    label="Stage"
                    options={[
                      { id: "ready_for_editing", label: "Ready for editing" },
                      { id: "ideation", label: "Ideation" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="deadline" label="Deadline (all)" type="date" />
                  <Field name="brief_url" label="Raw footage (Drive)" placeholder="https://drive.google.com/…" />
                </div>

                {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
                {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Cancel</button>
                  <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                    {pending ? "Adding…" : "Add videos"}
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

function Field({ name, label, type = "text", placeholder }: { name: string; label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input name={name} type={type} placeholder={placeholder} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors" />
    </label>
  );
}

function Select({ name, label, options, placeholder, required, defaultValue }: { name: string; label: string; options: Option[]; placeholder?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue ?? (placeholder !== undefined ? "" : options[0]?.id ?? "")} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
        {placeholder !== undefined && <option value="" className="bg-card">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-card">{o.label}</option>
        ))}
      </select>
    </label>
  );
}
