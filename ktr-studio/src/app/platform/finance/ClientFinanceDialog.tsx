"use client";

// Retainer/pakket per klant direct vanaf Finance bijwerken:
// klik op de klantregel, pas retainer, pakket, video's/mnd of
// editor-kosten aan, klaar.

import { useState, useTransition } from "react";
import { updateClientFinanceAction } from "./actions";

export function ClientFinanceDialog({
  clientId,
  name,
  monthlyValue,
  packageName,
  videosPerMonth,
  editorCost,
  videoPrice,
  invoiceDay = 1,
  currency: initialCurrency = "EUR",
  isOwnBrand: initialOwnBrand = false,
  children,
}: {
  clientId: string;
  name: string;
  monthlyValue: number;
  packageName: string | null;
  videosPerMonth: number;
  editorCost: number;
  videoPrice?: number | null;
  invoiceDay?: number;
  currency?: string;
  isOwnBrand?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Betaalt deze klant in dollars? Dan staan retainer, editor-kosten en
  // videoprijs in USD; Finance rekent alleen de totalen om naar euro.
  const [currency, setCurrency] = useState(initialCurrency === "USD" ? "USD" : "EUR");
  const sym = currency === "USD" ? "$" : "€";
  // Je eigen merk: geen retainer, wel echte edit-kosten per maand.
  const [ownBrand, setOwnBrand] = useState(initialOwnBrand);
  const [form, setForm] = useState({
    retainer: String(monthlyValue || ""),
    pakket: packageName ?? "",
    videos: String(videosPerMonth || ""),
    editorCost: String(editorCost || ""),
    videoPrice: String(videoPrice || ""),
    invoiceDay: String(invoiceDay || 1),
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateClientFinanceAction(clientId, {
        monthly_value: Number(form.retainer) || 0,
        package: form.pakket,
        videos_per_month: Number(form.videos) || 0,
        editor_cost: Number(form.editorCost) || 0,
        video_price: form.videoPrice.trim() ? Number(form.videoPrice.replace(",", ".")) : null,
        invoice_day: Math.min(28, Math.max(1, Number(form.invoiceDay) || 1)),
        currency,
        is_own_brand: ownBrand,
      });
      if (r.error) setError(r.error);
      else setOpen(false);
    });
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <button onClick={() => setOpen(true)} className="contents text-left" title="Klik om retainer/pakket aan te passen">
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-extrabold text-xl">{name}</h3>
              <div className="flex rounded-lg border border-white/[0.1] overflow-hidden text-[12px] shrink-0">
                {(["EUR", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 transition-colors ${currency === c ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
                  >
                    {c === "EUR" ? "€ EUR" : "$ USD"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Retainer {sym}/mnd</span>
                  <input value={form.retainer} onChange={(e) => setForm({ ...form, retainer: e.target.value })} type="number" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Editor-kosten {sym}</span>
                  <input value={form.editorCost} onChange={(e) => setForm({ ...form, editorCost: e.target.value })} type="number" className={field} />
                </label>
              </div>
              <label className="block">
                <span className={label}>Prijs per video {sym}</span>
                <input
                  value={form.videoPrice}
                  onChange={(e) => setForm({ ...form, videoPrice: e.target.value })}
                  inputMode="decimal"
                  placeholder="75,00"
                  className={field}
                />
                <span className="block mt-1 text-[11.5px] text-muted">
                  Vult automatisch de verkoopprijs in als je voor deze klant een video toevoegt.
                  {currency === "USD" && " Bedragen in dollars; de totalen op deze pagina rekenen we om naar euro."}
                </span>
              </label>
              <label className="block">
                <span className={label}>Factuur eruit op dag</span>
                <input value={form.invoiceDay} onChange={(e) => setForm({ ...form, invoiceDay: e.target.value })} type="number" min={1} max={28} className={field} />
                <span className="block mt-1 text-[11.5px] text-muted">
                  Staat er op die dag nog geen factuur in Moneybird, dan krijg je 's ochtends een melding.
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Pakket</span>
                  <input value={form.pakket} onChange={(e) => setForm({ ...form, pakket: e.target.value })} placeholder="Growth / YouTube…" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Video&rsquo;s/mnd</span>
                  <input value={form.videos} onChange={(e) => setForm({ ...form, videos: e.target.value })} type="number" className={field} />
                </label>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 cursor-pointer">
                <input type="checkbox" checked={ownBrand} onChange={(e) => setOwnBrand(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                <span>
                  <span className="block text-sm">Dit ben ik zelf</span>
                  <span className="block text-[11.5px] text-muted mt-0.5">
                    Geen retainer verwacht en geen factuur-herinnering. De edit-kosten tellen wel mee als maandkosten.
                  </span>
                </span>
              </label>

              {error && <p className="text-[13px] text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                  Annuleren
                </button>
                <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                  {pending ? "…" : "Opslaan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
