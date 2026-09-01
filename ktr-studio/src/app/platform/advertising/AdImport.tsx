"use client";

// CSV uit Ads Manager plakken. Je ziet eerst wat wij eruit halen —
// welke kolommen herkend zijn en de eerste regels — en pas daarna
// sla je op. Dezelfde export twee keer inlezen doet niets dubbel.

import { useMemo, useState, useTransition } from "react";
import { parseAdCsv } from "@/lib/ads-csv";
import { importAdCsvAction } from "./actions";
import { PLATFORMS } from "@/lib/ads-shared";

const eur = (n: number) => `€${n.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}`;

export function AdImport({ clients }: { clients: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [platform, setPlatform] = useState<string>("Meta");
  const [clientId, setClientId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const report = useMemo(() => (csv.trim().length > 20 ? parseAdCsv(csv) : null), [csv]);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await importAdCsvAction({ csv, platform, clientId: clientId || null });
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: r.message ?? "Ingelezen." });
        setCsv("");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3.5 py-2.5 text-sm transition-all"
      >
        ⇪ CSV importeren
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Advertentiedata importeren</h3>
            <p className="text-muted text-sm mb-5">
              Exporteer in Ads Manager per dag (Rapporten → Exporteren → CSV) en plak de inhoud hieronder.
              Kolomnamen mogen Nederlands of Engels zijn.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Platform</span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p} className="bg-card">{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Klant</span>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
                >
                  <option value="" className="bg-card">Eigen advertenties</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder={"Day,Campaign name,Ad name,Impressions,Link clicks,Amount spent (EUR),Results\n2026-08-01,Founders NL,Reel 12 hook A,4210,86,42.18,3"}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[12.5px] font-mono outline-none focus:border-accent/40 resize-y"
            />

            {report && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.015] p-3.5">
                {report.error ? (
                  <p className="text-[13px] text-red-400">{report.error}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <span className="text-sm font-medium">{report.rows.length} regels gevonden</span>
                      {report.skipped > 0 && (
                        <span className="text-[12px] text-muted">{report.skipped} overgeslagen (leeg of zonder datum)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {Object.entries(report.matched).map(([veld, kolom]) => (
                        <span
                          key={veld}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-mono ${
                            kolom ? "bg-emerald-400/10 text-emerald-400" : "bg-white/[0.04] text-muted"
                          }`}
                          title={kolom ? `Kolom: ${kolom}` : "Geen kolom gevonden — blijft leeg"}
                        >
                          {veld}{kolom ? " ✓" : " —"}
                        </span>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px] tabular-nums">
                        <thead>
                          <tr className="text-muted text-left">
                            <th className="font-mono font-normal uppercase text-[10px] tracking-wider pb-1 pr-3">Datum</th>
                            <th className="font-mono font-normal uppercase text-[10px] tracking-wider pb-1 pr-3">Advertentie</th>
                            <th className="font-mono font-normal uppercase text-[10px] tracking-wider pb-1 pr-3 text-right">Uitgaven</th>
                            <th className="font-mono font-normal uppercase text-[10px] tracking-wider pb-1 text-right">Resultaten</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.slice(0, 4).map((r, i) => (
                            <tr key={i} className="border-t border-white/[0.05]">
                              <td className="py-1 pr-3 whitespace-nowrap">{r.date}</td>
                              <td className="py-1 pr-3 truncate max-w-[220px]">{r.creative ?? r.campaign ?? "—"}</td>
                              <td className="py-1 pr-3 text-right">{eur(r.spend)}</td>
                              <td className="py-1 text-right">{r.results}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {msg && <p className={`mt-3 text-[13px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

            <div className="flex gap-2 pt-4">
              <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                Sluiten
              </button>
              <button
                onClick={save}
                disabled={pending || !report || !!report.error || report.rows.length === 0}
                className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm py-2.5 transition-colors"
              >
                {pending ? "Inlezen…" : report && !report.error ? `${report.rows.length} regels opslaan` : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
