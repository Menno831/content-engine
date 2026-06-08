"use client";

import { useActionState, useState } from "react";
import { updateAgencyAction, type SettingsResult } from "./actions";
import { Card, icons } from "../_components";

const initial: SettingsResult = {};
const PRESETS = ["#F97316", "#6366F1", "#10B981", "#EC4899", "#F43F5E", "#0EA5E9", "#EAB308"];

export function SettingsForm({ brandName, accent }: { brandName: string; accent: string }) {
  const [name, setName] = useState(brandName);
  const [color, setColor] = useState(accent);
  const [state, action, pending] = useActionState(updateAgencyAction, initial);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="font-display font-extrabold text-xl mb-5">White-label</h2>
        <form action={action} className="space-y-4">
          <label className="block">
            <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Merknaam</span>
            <input
              name="brand_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
            />
          </label>

          <div>
            <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Accentkleur</span>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setColor(p)}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{ background: p, borderColor: color.toLowerCase() === p.toLowerCase() ? "#fff" : "transparent" }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
            <input
              name="accent"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent/40"
            />
          </div>

          {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
          {state.ok && <p className="text-[13px] text-emerald-400">{state.ok} — ververs om de kleur overal te zien.</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-5 py-2.5 transition-colors"
          >
            {pending ? "Opslaan…" : "Opslaan"}
          </button>
        </form>
      </Card>

      {/* Live preview */}
      <Card className="p-6">
        <h2 className="font-display font-extrabold text-xl mb-5">Voorbeeld</h2>
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ ["--accent" as string]: color }}>
          <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06] bg-[#080808]">
            <span className="grid place-items-center w-8 h-8 rounded-lg text-background" style={{ background: color }}>
              {icons.spark}
            </span>
            <span className="font-display font-extrabold">{name || "Merknaam"}</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="h-2.5 w-1/2 rounded-full" style={{ background: color }} />
            <div className="h-2.5 w-2/3 rounded-full bg-white/[0.08]" />
            <button className="rounded-xl text-background font-bold text-sm px-4 py-2" style={{ background: color }}>
              Voorbeeld-knop
            </button>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-muted">
          De accentkleur kleurt knoppen, highlights en de actieve navigatie — voor jou én in elk klantportaal.
        </p>
      </Card>
    </div>
  );
}
