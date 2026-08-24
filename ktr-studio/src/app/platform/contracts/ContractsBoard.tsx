"use client";

import { useState, useTransition } from "react";
import { todayStr } from "@/lib/dates";
import { Card, Badge } from "../_components";
import { fmtEur } from "../_data";
import { createContractAction, updateContractStatusAction, deleteContractAction } from "./actions";
import { DocumentDialog } from "./DocumentDialog";

export interface ContractRow {
  id: string;
  title: string;
  clientName: string | null;
  party: string | null;
  value: number;
  recurring: boolean;
  status: string;
  startsOn: string | null;
  endsOn: string | null;
  docUrl: string | null;
  signToken?: string | null;
  signedName?: string | null;
  signedAt?: string | null;
}

const STATUSES = [
  { id: "concept", label: "Concept", color: "#6B7280" },
  { id: "verstuurd", label: "Verstuurd", color: "#FBBF24" },
  { id: "getekend", label: "Getekend", color: "#34D399" },
  { id: "verlopen", label: "Verlopen", color: "#F87171" },
];

export function ContractsBoard({
  initial,
  clients,
  ndaPrefill,
}: {
  initial: ContractRow[];
  clients: { id: string; label: string }[];
  ndaPrefill?: string | null;
}) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientId: "",
    party: "",
    value: "",
    recurring: true,
    status: "concept",
    startsOn: "",
    endsOn: "",
    docUrl: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      const r = await createContractAction({
        title: form.title,
        clientId: form.clientId || null,
        party: form.party,
        value: Number(form.value) || 0,
        recurring: form.recurring,
        status: form.status,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        docUrl: form.docUrl,
        notes: form.notes,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setRows((cur) => [
          {
            id: `tmp-${cur.length}`,
            title: form.title,
            clientName: clients.find((c) => c.id === form.clientId)?.label ?? null,
            party: form.party || null,
            value: Number(form.value) || 0,
            recurring: form.recurring,
            status: form.status,
            startsOn: form.startsOn || null,
            endsOn: form.endsOn || null,
            docUrl: form.docUrl || null,
          },
          ...cur,
        ]);
        setForm({ ...form, title: "", party: "", value: "", docUrl: "", notes: "" });
        setOpen(false);
      }
    });
  }

  function setStatus(id: string, status: string) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    start(async () => {
      await updateContractStatusAction(id, status);
    });
  }

  function remove(id: string) {
    if (!confirm("Contract verwijderen?")) return;
    setRows((cur) => cur.filter((r) => r.id !== id));
    start(async () => {
      await deleteContractAction(id);
    });
  }

  const today = todayStr();
  const in60 = todayStr(60);
  const expiring = rows.filter((r) => r.status === "getekend" && r.endsOn && r.endsOn >= today && r.endsOn <= in60);
  const signedValue = rows.filter((r) => r.status === "getekend" && r.recurring).reduce((s, r) => s + r.value, 0);
  const openValue = rows.filter((r) => r.status === "verstuurd").reduce((s, r) => s + r.value, 0);

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label="Getekend (per mnd)" value={fmtEur(signedValue)} tone="good" />
        <Tile label="Uitstaand" value={fmtEur(openValue)} tone={openValue > 0 ? "warn" : undefined} />
        <Tile label="Contracten" value={String(rows.length)} />
        <Tile label="Loopt af < 60 dgn" value={String(expiring.length)} tone={expiring.length ? "warn" : undefined} />
      </div>

      {expiring.length > 0 && (
        <Card className="p-5 mb-6 border-amber-400/20 bg-amber-400/[0.04]">
          <div className="font-display font-bold mb-2">Loopt binnenkort af</div>
          <div className="flex flex-wrap gap-2">
            {expiring.map((r) => (
              <span key={r.id} className="rounded-xl border border-white/[0.08] px-3 py-1.5 text-[13px]">
                {r.title}
                <span className="text-muted ml-2">
                  tot {new Date(r.endsOn!).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[13px] text-muted">Welke afspraken lopen, wat ze waard zijn en wanneer ze aflopen.</p>
        <div className="flex gap-2 shrink-0">
          <DocumentDialog
            clients={clients}
            prefillName={ndaPrefill ?? undefined}
            onCreated={(d) =>
              setRows((cur) => [
                {
                  id: `tmp-doc-${cur.length}`,
                  title: d.title,
                  clientName: clients.find((c) => c.id === d.clientId)?.label ?? null,
                  party: d.party,
                  value: d.value,
                  recurring: d.recurring,
                  status: "verstuurd",
                  startsOn: null,
                  endsOn: null,
                  docUrl: null,
                  signToken: d.token,
                },
                ...cur,
              ])
            }
          />
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
          >
            + Contract
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Nog geen contracten. Zet hier je retainer-afspraken en losse opdrachten in, dan zie je in één blik wat er
            loopt en wat er verlengd moet worden.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const st = STATUSES.find((s) => s.id === r.status) ?? STATUSES[0];
            return (
              <Card key={r.id} className="p-4 group">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.title}</span>
                      <Badge color={st.color}>{st.label}</Badge>
                      {r.clientName && <span className="text-[12px] text-muted">{r.clientName}</span>}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {r.signedAt && (
                        <span className="text-emerald-400">
                          ✓ getekend door {r.signedName} op{" "}
                          {new Date(r.signedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ·{" "}
                        </span>
                      )}
                      {fmtEur(r.value)}
                      {r.recurring ? "/mnd" : " eenmalig"}
                      {r.party && ` · ${r.party}`}
                      {r.startsOn && ` · vanaf ${new Date(r.startsOn).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`}
                      {r.endsOn && ` · tot ${new Date(r.endsOn).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.signToken && !r.signedAt && (
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/sign/${r.signToken}`)}
                        className="rounded-lg border border-accent/25 bg-accent/10 hover:bg-accent/20 text-accent px-2.5 py-1.5 text-[12px] font-bold transition-all"
                      >
                        ✍️ Kopieer ondertekenlink
                      </button>
                    )}
                    {r.signToken && (
                      <a
                        href={`/sign/${r.signToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
                      >
                        ↗ Document
                      </a>
                    )}
                    {!r.signToken && r.docUrl && (
                      <a
                        href={r.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
                      >
                        ↗ Document
                      </a>
                    )}
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      disabled={r.id.startsWith("tmp-")}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[12px] outline-none focus:border-accent/40"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id} className="bg-card">
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={r.id.startsWith("tmp-")}
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
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">Nieuw contract</h3>
            <div className="space-y-3.5">
              <label className="block">
                <span className={label}>Titel</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Retainer 2026 — 8 video's/mnd" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Klant</span>
                  <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={field}>
                    <option value="" className="bg-card">— geen —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={label}>Contactpersoon</span>
                  <input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} className={field} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Waarde €</span>
                  <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} type="number" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Status</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id} className="bg-card">{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="accent-[var(--accent)] w-4 h-4" />
                Maandelijks terugkerend
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Vanaf</span>
                  <input value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} type="date" className={field} />
                </label>
                <label className="block">
                  <span className={label}>Tot</span>
                  <input value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} type="date" className={field} />
                </label>
              </div>
              <label className="block">
                <span className={label}>Link naar document</span>
                <input value={form.docUrl} onChange={(e) => setForm({ ...form, docUrl: e.target.value })} placeholder="https://…" className={field} />
              </label>

              {error && <p className="text-[13px] text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Annuleren</button>
                <button onClick={create} disabled={pending || !form.title.trim()} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm py-2.5 transition-colors">
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
