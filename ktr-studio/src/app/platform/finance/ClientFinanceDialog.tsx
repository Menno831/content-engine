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
  children,
}: {
  clientId: string;
  name: string;
  monthlyValue: number;
  packageName: string | null;
  videosPerMonth: number;
  editorCost: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    retainer: String(monthlyValue || ""),
    pakket: packageName ?? "",
    videos: String(videosPerMonth || ""),
    editorCost: String(editorCost || ""),
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
          <div className="w-full max-w-sm bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">{name}</h3>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Retainer €/mnd</span>
                  <input value={form.retainer} onChange={(e) => setForm({ ...form, retainer: e.target.value })} type="number" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Editor-kosten €</span>
                  <input value={form.editorCost} onChange={(e) => setForm({ ...form, editorCost: e.target.value })} type="number" className={field} />
                </label>
              </div>
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
