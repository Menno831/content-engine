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
  const [gen, setGen] = useState<string | null>(null);
  const [state, action, pending] = useActionState(saveBrandDocsAction, initial);

  async function aiGenerate(field: FieldDef) {
    setGen(field.key);
    const context = `Klant: ${clientName} (${handle || "geen handle"}). ${
      vals.brand_identity ? `Identity: ${vals.brand_identity}. ` : ""
    }`;
    const template = `${field.instruction}\n\n${context}`;
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, input: clientName }),
      });
      const data = await res.json();
      if (data.ok) setVals((v) => ({ ...v, [field.key]: data.text }));
    } catch {
      /* stil falen */
    } finally {
      setGen(null);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-extrabold text-xl">Brand-context</h2>
        {state.ok && <span className="text-[13px] text-emerald-400">{state.ok}</span>}
        {state.error && <span className="text-[13px] text-red-400">{state.error}</span>}
      </div>
      <p className="text-muted text-sm mb-5">
        Leg vast wie de klant is. De <strong>brand voice</strong> stuurt straks alle AI-gegenereerde content aan.
      </p>

      <form action={action} className="space-y-5">
        <input type="hidden" name="client_id" value={clientId} />
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-mono uppercase tracking-wider text-muted">{f.label}</label>
              <button
                type="button"
                onClick={() => aiGenerate(f)}
                disabled={gen === f.key}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-50 px-2.5 py-1 text-[11px] transition-all"
              >
                {gen === f.key ? (
                  <span className="w-3 h-3 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
                ) : (
                  icons.spark
                )}
                AI-genereer
              </button>
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
    </Card>
  );
}
