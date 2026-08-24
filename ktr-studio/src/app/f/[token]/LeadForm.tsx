"use client";

import { useState, useTransition } from "react";
import { submitLeadFormAction } from "./actions";

export function LeadForm({
  token,
  buttonLabel,
  askPhone,
  askInstagram,
}: {
  token: string;
  buttonLabel: string;
  askPhone: boolean;
  askInstagram: boolean;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", instagram: "", note: "", website: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await submitLeadFormAction(token, form);
      if (r.error) setError(r.error);
      else {
        setError("");
        setDone(true);
      }
    });
  }

  const field =
    "w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-[15px] outline-none focus:border-accent/50 transition-colors";

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-6 py-8 text-center">
        <div className="text-3xl mb-2">✓</div>
        <h2 className="font-display font-extrabold text-xl mb-1">Gelukt</h2>
        <p className="text-muted text-sm">Je bericht staat binnen. We nemen snel contact op.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Honeypot: onzichtbaar voor mensen, bots vullen het wel in. */}
      <input
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-px w-px opacity-0"
      />
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Je naam"
        className={field}
      />
      <input
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        type="email"
        placeholder="E-mail"
        className={field}
      />
      {askPhone && (
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          type="tel"
          placeholder="Telefoon"
          className={field}
        />
      )}
      {askInstagram && (
        <input
          value={form.instagram}
          onChange={(e) => setForm({ ...form, instagram: e.target.value })}
          placeholder="@jouwinstagram"
          className={field}
        />
      )}
      <textarea
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
        rows={3}
        placeholder="Waar kunnen we mee helpen? (optioneel)"
        className={field + " resize-y"}
      />

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || !form.name.trim()}
        className="w-full rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold py-3.5 transition-colors"
      >
        {pending ? "Versturen…" : buttonLabel}
      </button>
    </div>
  );
}
