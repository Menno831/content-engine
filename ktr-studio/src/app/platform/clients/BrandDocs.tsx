"use client";

import { useActionState, useState } from "react";
import { saveBrandDocsAction, type ActionResult } from "./actions";
import { Card, icons } from "../_components";

const initial: ActionResult = {};

interface FieldDef {
  key: "brand_identity" | "brand_story" | "brand_strategy" | "brand_voice";
  label: string;
  hint: string;
  rows: number;
  instruction: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "brand_identity",
    label: "Brand identity",
    hint: "Wie is dit merk? Kernwaarden, positionering en voor wie.",
    rows: 4,
    instruction: "Schrijf een beknopte brand identity: kernwaarden, positionering en doelgroep. Max ~120 woorden.",
  },
  {
    key: "brand_story",
    label: "Brand story",
    hint: "Origin: waar komen ze vandaan, waarom dit, welke transformatie.",
    rows: 4,
    instruction: "Schrijf de brand story / origin: waar komt deze founder vandaan, waarom doen ze dit, en welke transformatie bieden ze. Max ~150 woorden.",
  },
  {
    key: "brand_strategy",
    label: "Brand strategy",
    hint: "3 content-pijlers + funnel (top/mid/bottom) + CTA-aanpak.",
    rows: 5,
    instruction: "Schrijf een content brand strategy: 3 content-pijlers, een funnel (top/mid/bottom) en de CTA-aanpak. Bullets mogen.",
  },
  {
    key: "brand_voice",
    label: "Brand voice ★",
    hint: "Toon, stijl, do's & don'ts. Stuurt straks alle AI-content aan.",
    rows: 5,
    instruction: "Definieer de brand voice: toon, stijl, do's en don'ts, en 3 voorbeeldzinnen. Bondig en concreet.",
  },
];

export function BrandDocs({
  clientId,
  clientName,
  handle,
  values,
}: {
  clientId: string;
  clientName: string;
  handle: string;
  values: Record<string, string>;
}) {
  const [vals, setVals] = useState<Record<string, string>>(values);
  const [openDocs, setOpenDocs] = useState(false);
  const [state, action, pending] = useActionState(saveBrandDocsAction, initial);

  return (
    <Card className="p-6">
      <button type="button" onClick={() => setOpenDocs((o) => !o)} className="w-full text-left">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-extrabold text-xl">Brand-context {openDocs ? "▾" : "▸"}</h2>
          {state.ok && <span className="text-[13px] text-emerald-400">{state.ok}</span>}
          {state.error && <span className="text-[13px] text-red-400">{state.error}</span>}
        </div>
        <p className="text-muted text-sm mb-2">
          Optioneel naslagwerk per klant — de <strong>brand voice</strong> stuurt de AI-content aan. Ingeklapt tot je &rsquo;m nodig hebt.
        </p>
      </button>

      {openDocs && (
      <form action={action} className="space-y-5 mt-3">
        <input type="hidden" name="client_id" value={clientId} />
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-mono uppercase tracking-wider text-muted">{f.label}</label>
            </div>
            <textarea
              name={f.key}
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={f.rows}
              placeholder={f.hint}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y leading-relaxed"
            />
          </div>
        ))}

        {/* Brand-kleuren: sturen carousels/stories/thumbnails aan */}
        <div>
          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">
            Brand-kleuren <span className="normal-case tracking-normal">— gebruikt in gegenereerde visuals</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input
                type="color"
                name="brand_primary"
                value={vals.brand_primary || "#F97316"}
                onChange={(e) => setVals((v) => ({ ...v, brand_primary: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-white/[0.1] bg-transparent cursor-pointer"
              />
              Hoofdkleur
            </label>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input
                type="color"
                name="brand_secondary"
                value={vals.brand_secondary || "#0C0C0C"}
                onChange={(e) => setVals((v) => ({ ...v, brand_secondary: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-white/[0.1] bg-transparent cursor-pointer"
              />
              Secundair
            </label>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Interne notities</label>
          <textarea
            name="notes"
            value={vals.notes ?? ""}
            onChange={(e) => setVals((v) => ({ ...v, notes: e.target.value }))}
            rows={2}
            placeholder="Afspraken, voorkeuren, do's en don'ts voor het team."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-5 py-2.5 transition-colors"
        >
          {pending ? "Opslaan…" : "Brand-context opslaan"}
        </button>
      </form>
      )}
    </Card>
  );
}
