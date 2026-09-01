"use client";

// Eén regel handmatig toevoegen — voor als je even geen export bij de
// hand hebt, of voor een boost die je los hebt gedraaid.

import { useState, useTransition } from "react";
import { addAdEntryAction } from "./actions";
import { PLATFORMS } from "@/lib/ads-shared";

export function AdQuickAdd({ clients }: { clients: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(formData: FormData) {
    setMsg(null);
    const num = (k: string) => Number(String(formData.get(k) ?? "0").replace(",", ".")) || 0;
    start(async () => {
      const r = await addAdEntryAction({
        date: String(formData.get("date") ?? ""),
        platform: String(formData.get("platform") ?? "Meta"),
        campaign: String(formData.get("campaign") ?? ""),
        adset: String(formData.get("adset") ?? ""),
        creative: String(formData.get("creative") ?? ""),
        clientId: String(formData.get("client_id") ?? "") || null,
        impressions: num("impressions"),
        clicks: num("clicks"),
        spend: num("spend"),
        results: num("results"),
        revenue: num("revenue"),
      });
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: r.message ?? "Toegevoegd." });
        setTimeout(() => setOpen(false), 700);
      }
    });
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
      >
        + Regel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Advertentieregel</h3>
            <p className="text-muted text-sm mb-5">Eén dag, één advertentie. Laat leeg wat je niet weet.</p>

            <form action={submit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Datum</span>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Platform</span>
                  <select name="platform" className={field}>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p} className="bg-card">{p}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className={label}>Klant</span>
                <select name="client_id" className={field}>
                  <option value="" className="bg-card">Eigen advertenties</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={label}>Campagne</span>
                <input name="campaign" placeholder="Founders NL — leads" className={field} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Doelgroep</span>
                  <input name="adset" placeholder="Lookalike 1%" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Advertentie</span>
                  <input name="creative" placeholder="Reel 12 — hook A" className={field} />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className={label}>Uitgaven €</span>
                  <input name="spend" inputMode="decimal" placeholder="42,18" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Vertoningen</span>
                  <input name="impressions" inputMode="numeric" placeholder="4210" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Klikken</span>
                  <input name="clicks" inputMode="numeric" placeholder="86" className={field} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Resultaten</span>
                  <input name="results" inputMode="numeric" placeholder="3" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Omzet €</span>
                  <input name="revenue" inputMode="decimal" placeholder="0" className={field} />
                </label>
              </div>

              {msg && <p className={`text-[13px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                  Annuleren
                </button>
                <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                  {pending ? "Opslaan…" : "Toevoegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
