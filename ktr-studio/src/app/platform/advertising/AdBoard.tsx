"use client";

// Advertentie-uitgaven: wat ging eruit, en wat kwam er in die maand
// binnen aan leads en omzet. Zo zie je of boosten iets oplevert.

import { useMemo, useState, useTransition } from "react";
import { Card } from "../_components";
import { fmtEur } from "../_data";
import { addAdSpendAction, deleteAdSpendAction } from "./actions";

export interface SpendRow {
  id: string;
  month: string;
  platform: string;
  amount: number;
  clientId: string | null;
  clientName: string | null;
  notes: string | null;
}

export interface MonthResult {
  month: string;
  leads: number;
  won: number;
  revenue: number;
}

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Google", "Anders"];

export function AdBoard({
  initial,
  results,
  clients,
}: {
  initial: SpendRow[];
  results: MonthResult[];
  clients: { id: string; label: string }[];
}) {
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    platform: "Instagram",
    amount: "",
    clientId: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const byMonth = useMemo(() => {
    const map = new Map<string, { spend: number; rows: SpendRow[] }>();
    for (const r of rows) {
      const cur = map.get(r.month) ?? { spend: 0, rows: [] };
      cur.spend += r.amount;
      cur.rows.push(r);
      map.set(r.month, cur);
    }
    return [...map.entries()]
      .map(([month, v]) => {
        const res = results.find((x) => x.month === month);
        return {
          month,
          spend: v.spend,
          rows: v.rows,
          leads: res?.leads ?? 0,
          won: res?.won ?? 0,
          revenue: res?.revenue ?? 0,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [rows, results]);

  const totalSpend = rows.reduce((s, r) => s + r.amount, 0);
  const totalRevenue = byMonth.reduce((s, m) => s + m.revenue, 0);
  const totalLeads = byMonth.reduce((s, m) => s + m.leads, 0);

  function add() {
    if (!form.amount) return;
    start(async () => {
      const r = await addAdSpendAction({
        month: form.month,
        platform: form.platform,
        amount: Number(form.amount) || 0,
        clientId: form.clientId || null,
        notes: form.notes,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setRows((cur) => [
          {
            id: `tmp-${cur.length}`,
            month: form.month,
            platform: form.platform,
            amount: Number(form.amount) || 0,
            clientId: form.clientId || null,
            clientName: clients.find((c) => c.id === form.clientId)?.label ?? null,
            notes: form.notes || null,
          },
          ...cur,
        ]);
        setForm({ ...form, amount: "", notes: "" });
      }
    });
  }

  function remove(id: string) {
    setRows((cur) => cur.filter((r) => r.id !== id));
    start(async () => {
      await deleteAdSpendAction(id);
    });
  }

  const field = "rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40";

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label="Uitgegeven" value={fmtEur(totalSpend)} tone={totalSpend > 0 ? "warn" : undefined} />
        <Tile label="Leads in die maanden" value={String(totalLeads)} />
        <Tile label="Omzet uit gesloten deals" value={fmtEur(totalRevenue)} tone="good" />
        <Tile
          label="Kosten per lead"
          value={totalLeads > 0 ? fmtEur(Math.round(totalSpend / totalLeads)) : "—"}
        />
      </div>

      <Card className="p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-2">
          <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} type="month" className={field + " lg:w-40"} />
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={field + " lg:w-36"}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p} className="bg-card">{p}</option>
            ))}
          </select>
          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={field + " lg:w-44"}>
            <option value="" className="bg-card">— eigen kanaal —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
            ))}
          </select>
          <input
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            type="number"
            placeholder="€ bedrag"
            className={field + " lg:w-32"}
          />
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Waarvoor? (bv. reel geboost)"
            className={field + " flex-1 min-w-0"}
          />
          <button
            onClick={add}
            disabled={pending || !form.amount}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-5 py-2.5 transition-colors"
          >
            + Uitgave
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
      </Card>

      {byMonth.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Nog geen uitgaven. Zet hier wat je aan boosts of ads uitgeeft, dan zie je per maand of het leads en omzet
            opleverde.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {byMonth.map((m) => {
            const roas = m.spend > 0 ? m.revenue / m.spend : 0;
            return (
              <Card key={m.month} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="font-display font-extrabold">
                    {new Date(`${m.month}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
                    <span>
                      <span className="text-muted text-[12px]">Uitgegeven </span>
                      <strong className="font-mono text-red-400">{fmtEur(m.spend)}</strong>
                    </span>
                    <span>
                      <span className="text-muted text-[12px]">Leads </span>
                      <strong className="font-mono">{m.leads}</strong>
                    </span>
                    <span>
                      <span className="text-muted text-[12px]">Omzet </span>
                      <strong className="font-mono text-emerald-400">{fmtEur(m.revenue)}</strong>
                    </span>
                    <span>
                      <span className="text-muted text-[12px]">Rendement </span>
                      <strong className={`font-mono ${roas >= 1 ? "text-emerald-400" : "text-amber-300"}`}>
                        {m.spend > 0 ? `${roas.toFixed(1)}×` : "—"}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {m.rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors group text-[13px]">
                      <span className="truncate">
                        <span className="text-muted">{r.platform}</span>
                        {r.clientName && <span className="text-muted"> · {r.clientName}</span>}
                        {r.notes && <span className="ml-2">{r.notes}</span>}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-mono">{fmtEur(r.amount)}</span>
                        <button
                          onClick={() => remove(r.id)}
                          disabled={r.id.startsWith("tmp-")}
                          className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all disabled:opacity-0"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className={`font-display font-extrabold text-2xl ${tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
