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
const FORMATS = ["Longform", "Clip", "Lifestyle", "VO story", "Talking", "Trio", "Carrousel"];

interface Option {
  id: string;
  label: string;
}

// Bewust volledig Engels: dit scherm is er ook voor de editors —
// één taal houdt het simpel.
export function AddContentDialog({
  clients,
  editors,
  defaultClient,
}: {
  clients: Option[];
  editors: Option[];
  defaultClient?: string;
}) {
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
        {icons.plus} Add card
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">New card</h3>
            <p className="text-muted text-sm mb-5">Assign an editor and they get an email when it&rsquo;s ready for editing.</p>

            {clients.length === 0 ? (
              <p className="text-[13px] text-amber-300">Add a client first.</p>
            ) : (
              <form action={action} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Select name="client_id" label="Client" options={clients} required defaultValue={defaultClient} />
                  <Select name="stage" label="Stage" options={STAGE_ORDER.map((s) => ({ id: s, label: stageMeta[s].label }))} />
                </div>
                <Field name="title" label="Title" placeholder="Client result reveal" required />
                <div className="grid grid-cols-2 gap-3">
                  <Select name="format" label="Format" options={FORMATS.map((f) => ({ id: f, label: f }))} />
                  <Field name="content_type" label="Type" placeholder="Talking head / B-roll" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="deadline" label="Deadline" type="date" />
                  <Select name="editor_id" label="Editor" options={editors} placeholder={editors.length ? "— none —" : "No editors yet"} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="posting_date" label="Goes live on" type="date" />
                  <Field name="reference_url" label="Reference video" placeholder="https://… — how it should look" />
                </div>
                <Field name="brief_url" label="Raw footage (Drive)" placeholder="https://drive.google.com/… — where the files are" />
                <Field name="frame_url" label="Delivery (Frame)" placeholder="https://f.io/… — filled in by the editor" />
                <Field name="vo_url" label="Voice-over file" placeholder="https://… — VO stories only" />
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Extra notes</span>
                  <textarea
                    name="footage_notes"
                    rows={3}
                    placeholder="Which footage, which trip, which folder, anything the editor should know"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors resize-y"
                  />
                </label>

                {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
                {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Cancel</button>
                  <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">{pending ? "Saving…" : "Add card"}</button>
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
