"use client";

import { useState, useTransition } from "react";
import { signDocumentAction } from "./actions";

export function SignForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function sign() {
    start(async () => {
      const r = await signDocumentAction(token, name);
      if (r.error) setError(r.error);
      else {
        setError("");
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-6 py-6 text-center">
        <div className="text-2xl mb-1">✓</div>
        <p className="font-display font-extrabold">Ondertekend</p>
        <p className="text-muted text-sm mt-1">
          Bedankt, {name.trim()}. Beide partijen hebben nu een vastgelegde versie — je kunt deze pagina printen of
          bewaren.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <p className="text-[13px] text-muted mb-3">
        Lees het document hierboven. Door je naam in te vullen en op &ldquo;Onderteken&rdquo; te klikken ga je akkoord —
        dit wordt vastgelegd met datum en tijd.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Je volledige naam"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-[15px] outline-none focus:border-accent/50 mb-3"
      />
      <label className="flex items-start gap-2.5 text-[13px] cursor-pointer mb-4">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="accent-[var(--accent)] w-4 h-4 mt-0.5" />
        Ik heb het document gelezen en ga akkoord met de inhoud.
      </label>
      {error && <p className="mb-3 text-[13px] text-red-400">{error}</p>}
      <button
        onClick={sign}
        disabled={pending || !agreed || name.trim().length < 2}
        className="w-full rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold py-3 transition-colors"
      >
        {pending ? "Vastleggen…" : "✍️ Onderteken"}
      </button>
    </div>
  );
}
