"use client";

// Dag afsluiten: kort invullen wat af is, waar je vastliep en wat morgen
// als eerste moet. Eén per persoon per dag — opnieuw indienen overschrijft.

import { useState, useTransition } from "react";
import { Card } from "../_components";
import { submitEodAction } from "../clients/[id]/actions";

export function EodForm({
  today,
  isEditor = false,
}: {
  today: { done: string; blockers: string; tomorrow: string; videos: number } | null;
  isEditor?: boolean;
}) {
  // Editors zijn Engelstalig — zelfde formulier, andere labels.
  const t = isEditor
    ? { mine: "Your EOD for today", close: "Close your day", done: "What's finished?", donePh: "e.g. 3 reels edited, longform delivered, revisions done.", stuck: "Where did you get stuck?", stuckPh: "Waiting on footage, approval pending…", first: "First thing tomorrow", firstPh: "What do you pick up first tomorrow?", vids: "Videos finished", sending: "Sending…", update: "Update EOD", submit: "Submit EOD", updated: "Updated ✓", sent: "Submitted ✓" }
    : { mine: "Jouw EOD van vandaag", close: "Sluit je dag af", done: "Wat is er af?", donePh: "Bijv. 3 reels gemonteerd voor Jip, longform week 34 aangeleverd, calls met 2 prospects.", stuck: "Waar liep je vast?", stuckPh: "Wacht op footage, approval blijft liggen…", first: "Morgen als eerste", firstPh: "Wat pak je morgen als eerste op?", vids: "Video's afgerond", sending: "Versturen…", update: "EOD bijwerken", submit: "EOD indienen", updated: "Bijgewerkt ✓", sent: "Ingediend ✓" };
  const [form, setForm] = useState({
    done: today?.done ?? "",
    blockers: today?.blockers ?? "",
    tomorrow: today?.tomorrow ?? "",
    videos: String(today?.videos ?? 0),
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await submitEodAction({
        done: form.done,
        blockers: form.blockers,
        tomorrow: form.tomorrow,
        videos: Number(form.videos) || 0,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setMsg(today ? t.updated : t.sent);
        setTimeout(() => setMsg(""), 2000);
      }
    });
  }

  const field =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-extrabold text-xl">
          {today ? t.mine : t.close}
        </h2>
        {msg && <span className="text-[13px] text-emerald-400">{msg}</span>}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className={label}>{t.done}</span>
          <textarea
            value={form.done}
            onChange={(e) => setForm({ ...form, done: e.target.value })}
            rows={4}
            placeholder={t.donePh}
            className={field}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>{t.stuck}</span>
            <textarea
              value={form.blockers}
              onChange={(e) => setForm({ ...form, blockers: e.target.value })}
              rows={3}
              placeholder={t.stuckPh}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>{t.first}</span>
            <textarea
              value={form.tomorrow}
              onChange={(e) => setForm({ ...form, tomorrow: e.target.value })}
              rows={3}
              placeholder={t.firstPh}
              className={field}
            />
          </label>
        </div>

        <label className="block max-w-[200px]">
          <span className={label}>{t.vids}</span>
          <input
            value={form.videos}
            onChange={(e) => setForm({ ...form, videos: e.target.value })}
            type="number"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>

        {error && <p className="text-[13px] text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={pending || !form.done.trim()}
          className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-6 py-2.5 transition-colors"
        >
          {pending ? t.sending : today ? t.update : t.submit}
        </button>
      </div>
    </Card>
  );
}
