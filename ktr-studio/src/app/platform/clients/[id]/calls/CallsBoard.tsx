"use client";

// Calls per klant: wat er gepland staat en wat eruit kwam.
// Ook bruikbaar los van een klant via de Agenda-pagina.

import { useState, useTransition } from "react";
import { Card, Badge } from "../../../_components";
import { addMeetingAction, updateMeetingAction, deleteMeetingAction } from "../actions";
import type { Meeting } from "@/lib/workspace";

const OUTCOMES = [
  { id: "gepland", label: "Gepland", color: "#60A5FA" },
  { id: "gehouden", label: "Gehouden", color: "#34D399" },
  { id: "no_show", label: "No-show", color: "#F87171" },
  { id: "verzet", label: "Verzet", color: "#FBBF24" },
];

export function CallsBoard({
  clientId,
  clientName,
  initial,
}: {
  clientId: string | null;
  clientName?: string;
  initial: Meeting[];
}) {
  const [meetings, setMeetings] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: clientName ? `Call ${clientName}` : "",
    startsAt: "",
    duration: "30",
    attendees: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add() {
    start(async () => {
      const r = await addMeetingAction({
        clientId,
        title: form.title,
        startsAt: form.startsAt,
        duration: Number(form.duration) || 30,
        attendees: form.attendees,
        notes: form.notes,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setMeetings((cur) =>
          [
            ...cur,
            {
              id: `tmp-${cur.length}`,
              title: form.title,
              startsAt: new Date(form.startsAt).toISOString(),
              duration: Number(form.duration) || 30,
              clientId,
              clientName: clientName ?? null,
              attendees: form.attendees || null,
              notes: form.notes || null,
              outcome: "gepland",
            },
          ].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        );
        setForm({ ...form, startsAt: "", notes: "" });
        setOpen(false);
      }
    });
  }

  function setOutcome(id: string, outcome: string) {
    setMeetings((cur) => cur.map((m) => (m.id === id ? { ...m, outcome } : m)));
    start(async () => {
      await updateMeetingAction(id, { outcome });
    });
  }

  function remove(id: string) {
    setMeetings((cur) => cur.filter((m) => m.id !== id));
    start(async () => {
      await deleteMeetingAction(id);
    });
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.startsAt).getTime() >= now - 3_600_000);
  const past = meetings.filter((m) => new Date(m.startsAt).getTime() < now - 3_600_000).reverse();

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-muted">Wat er gepland staat en wat eruit kwam.</p>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
        >
          + Call inplannen
        </button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm">Nog geen calls ingepland.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title="Staat gepland" items={upcoming} onOutcome={setOutcome} onRemove={remove} />
          )}
          {past.length > 0 && <Section title="Geweest" items={past} onOutcome={setOutcome} onRemove={remove} dim />}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">Call inplannen</h3>
            <div className="space-y-3.5">
              <label className="block">
                <span className={label}>Titel</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Maandelijkse check-in" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Wanneer</span>
                  <input value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} type="datetime-local" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Duur (min)</span>
                  <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} type="number" className={field} />
                </label>
              </div>
              <label className="block">
                <span className={label}>Wie sluiten aan</span>
                <input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="Menno, klant" className={field} />
              </label>
              <label className="block">
                <span className={label}>Notities vooraf</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={field + " resize-y"} />
              </label>

              {error && <p className="text-[13px] text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                  Annuleren
                </button>
                <button onClick={add} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                  {pending ? "…" : "Inplannen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  items,
  onOutcome,
  onRemove,
  dim,
}: {
  title: string;
  items: Meeting[];
  onOutcome: (id: string, outcome: string) => void;
  onRemove: (id: string) => void;
  dim?: boolean;
}) {
  return (
    <div>
      <h2 className="font-display font-extrabold mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((m) => {
          const o = OUTCOMES.find((x) => x.id === (m.outcome ?? "gepland")) ?? OUTCOMES[0];
          const d = new Date(m.startsAt);
          return (
            <Card key={m.id} className={`p-4 group ${dim ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{m.title}</span>
                    <Badge color={o.color}>{o.label}</Badge>
                    {m.clientName && <span className="text-[12px] text-muted">{m.clientName}</span>}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5">
                    {d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                    {d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · {m.duration} min
                    {m.attendees && ` · ${m.attendees}`}
                  </div>
                  {m.notes && <p className="text-[12.5px] text-foreground/75 mt-1.5">{m.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={m.outcome ?? "gepland"}
                    onChange={(e) => onOutcome(m.id, e.target.value)}
                    disabled={m.id.startsWith("tmp-")}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[12px] outline-none focus:border-accent/40"
                  >
                    {OUTCOMES.map((x) => (
                      <option key={x.id} value={x.id} className="bg-card">
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onRemove(m.id)}
                    disabled={m.id.startsWith("tmp-")}
                    className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all disabled:opacity-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
