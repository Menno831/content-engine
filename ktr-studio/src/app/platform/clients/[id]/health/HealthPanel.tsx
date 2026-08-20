"use client";

// Health: hoe staat deze klant ervoor, wie beheert 'm, en wil je 'm
// nog in de lijst zien. Kort en eerlijk — bedoeld om churn te zien
// aankomen voordat de opzegmail er is.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../../../_components";
import { updateClientHealthAction } from "../actions";

const LEVELS = [
  { id: "goed", label: "Goed", color: "#34D399", hint: "Levert op, klant is tevreden." },
  { id: "let_op", label: "Let op", color: "#FBBF24", hint: "Iets loopt stroef — actie nodig." },
  { id: "risico", label: "Risico", color: "#F87171", hint: "Kan opzeggen als er niks verandert." },
];

const STATUSES = [
  { id: "actief", label: "Actief" },
  { id: "onboarding", label: "Onboarding" },
  { id: "gepauzeerd", label: "Gepauzeerd" },
];

export function HealthPanel({
  clientId,
  health,
  healthNote,
  manager,
  hidden,
  status,
}: {
  clientId: string;
  health: string | null;
  healthNote: string | null;
  manager: string | null;
  hidden: boolean;
  status: string;
}) {
  const [form, setForm] = useState({
    health: health ?? "",
    healthNote: healthNote ?? "",
    manager: manager ?? "",
    hidden,
    status,
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(patch: Partial<typeof form>) {
    const next = { ...form, ...patch };
    setForm(next);
    start(async () => {
      const r = await updateClientHealthAction(clientId, {
        health: next.health,
        health_note: next.healthNote,
        manager: next.manager,
        hidden: next.hidden,
        status: next.status,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setMsg("Opgeslagen ✓");
        setTimeout(() => setMsg(""), 1500);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Eyebrow>Hoe staat het ervoor</Eyebrow>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl">Klant-gezondheid</h2>
          {msg && <span className="text-[12.5px] text-emerald-400">{msg}</span>}
        </div>

        <div className="space-y-2 mb-4">
          {LEVELS.map((l) => {
            const on = form.health === l.id;
            return (
              <button
                key={l.id}
                onClick={() => save({ health: on ? "" : l.id })}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                  on ? "border-accent/40 bg-accent/[0.06]" : "border-white/[0.06] hover:border-white/[0.14]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="font-medium text-sm">{l.label}</span>
                </div>
                <p className="text-[12px] text-muted mt-0.5 ml-[18px]">{l.hint}</p>
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Wat speelt er</span>
          <textarea
            value={form.healthNote}
            onChange={(e) => setForm({ ...form, healthNote: e.target.value })}
            onBlur={() => save({})}
            rows={4}
            placeholder="Bijv. reageert traag op approvals, of: wil meer YouTube maar levert geen footage."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y"
          />
        </label>
        {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
      </Card>

      <Card className="p-6 h-fit">
        <Eyebrow>Beheer</Eyebrow>
        <h2 className="font-display font-extrabold text-xl mb-4">Instellingen</h2>

        <label className="block mb-4">
          <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Beheerder (CSM)</span>
          <input
            value={form.manager}
            onChange={(e) => setForm({ ...form, manager: e.target.value })}
            onBlur={() => save({})}
            placeholder="Wie is het aanspreekpunt"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <div className="mb-4">
          <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Status</span>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => save({ status: s.id })}
                className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                  form.status === s.id
                    ? "bg-accent text-background font-bold"
                    : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hidden}
            onChange={(e) => save({ hidden: e.target.checked })}
            className="accent-[var(--accent)] w-4 h-4 mt-0.5"
          />
          <span>
            <span className="text-sm font-medium">Verbergen uit de klantenlijst</span>
            <span className="block text-[12px] text-muted mt-0.5">
              Blijft bestaan met alle data, maar staat niet meer in je dagelijkse overzicht.
            </span>
          </span>
        </label>

        <p className="text-[11.5px] text-muted mt-4">
          {pending ? "Opslaan…" : "Wijzigingen worden direct opgeslagen."}
        </p>
      </Card>
    </div>
  );
}
