"use client";

import { useState, useTransition } from "react";
import { Card, Avatar, Badge } from "../_components";
import { fmtEur, type Editor } from "../_data";
import { updateEditorPoolAction, updateEditorAction, deleteEditorAction } from "./actions";

const POOL = ["actief", "pool", "gestopt"] as const;
const poolColor: Record<string, string> = { actief: "#34D399", pool: "#FBBF24", gestopt: "#6B7280" };

interface ClientOption {
  id: string;
  label: string;
}

export function EditorPool({ editors, clients }: { editors: Editor[]; clients: ClientOption[] }) {
  const [, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Groepeer op status: actief eerst, dan pool (achterhand), dan gestopt.
  const groups = POOL.map((status) => ({
    status,
    items: editors.filter((e) => (e.poolStatus ?? (e.active ? "actief" : "pool")) === status),
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Houd je hele editor-bestand bij — wie levert wat goed, wie zit in de achterhand. Zo zit je nooit zonder editor en hoef je niet meer in WhatsApp te zoeken.
      </p>
      {msg && <p className="text-[13px] text-emerald-400">{msg}</p>}

      {groups.map((g) => (
        <div key={g.status}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: poolColor[g.status] }} />
            <span className="font-display font-bold capitalize">{g.status === "pool" ? "Pool (achterhand)" : g.status}</span>
            <span className="font-mono text-[11px] text-muted">{g.items.length}</span>
          </div>
          {g.items.length === 0 ? (
            <p className="text-[12px] text-muted mb-2 pl-4">Niemand in deze categorie.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {g.items.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar initials={e.name.slice(0, 2).toUpperCase()} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-[12px] text-muted truncate">{e.specialty || "Geen specialiteit"}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[12px] mb-3">
                    {e.contact && (
                      <div className="flex items-center gap-1.5 text-muted">
                        <span className="text-foreground/60">Contact:</span>
                        <span className="truncate">{e.contact}</span>
                      </div>
                    )}
                    {e.portfolioUrl && (
                      <a href={e.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover block truncate">
                        Portfolio bekijken →
                      </a>
                    )}
                    <div className="text-muted">{fmtEur(e.payPerVideo)} / video · {e.videosThisMonth} deze maand</div>
                  </div>
                  <select
                    value={g.status}
                    onChange={(ev) => {
                      const status = ev.target.value;
                      setMsg(null);
                      start(async () => {
                        const r = await updateEditorPoolAction(e.id, status);
                        if (r.ok) setMsg(`${e.name}: ${status}`);
                      });
                    }}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[12px] outline-none focus:border-accent/40"
                    style={{ color: poolColor[g.status] }}
                  >
                    {POOL.map((s) => (
                      <option key={s} value={s} className="bg-card text-foreground">{s === "pool" ? "pool (achterhand)" : s}</option>
                    ))}
                  </select>
                  <EditEditorButton editor={e} clients={clients} />
                  <span className="sr-only"><Badge color={poolColor[g.status]}>{g.status}</Badge></span>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


// Bewerken + verwijderen per editor: naam, e-mail (voor de mails vanaf
// het board), tarief, specialiteit, contact en portfolio.
function EditEditorButton({ editor, clients }: { editor: Editor; clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: editor.name,
    email: editor.email ?? "",
    pay: String(editor.payPerVideo ?? 0),
    specialty: editor.specialty ?? "",
    contact: editor.contact ?? "",
    portfolio: editor.portfolioUrl ?? "",
    notes: editor.notes ?? "",
  });
  const [clientIds, setClientIds] = useState<string[]>(editor.clientIds ?? []);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateEditorAction(editor.id, {
        name: form.name,
        email: form.email,
        pay_per_video: Number(form.pay) || 0,
        specialty: form.specialty,
        contact: form.contact,
        portfolio_url: form.portfolio,
        notes: form.notes,
        client_ids: clientIds,
      });
      setError(r.error ?? "");
      setOk(r.ok ?? "");
      if (r.ok) setTimeout(() => setOpen(false), 700);
    });
  }

  function remove() {
    if (!confirm(`${editor.name} verwijderen? Kaarten op het board raken de toewijzing kwijt.`)) return;
    start(async () => {
      const r = await deleteEditorAction(editor.id);
      setError(r.error ?? "");
      if (r.ok) setOpen(false);
    });
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); setOk(""); }}
        className="w-full mt-2 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
      >
        ✏️ Bewerken
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">{editor.name}</h3>
            <div className="space-y-3.5">
              <label className="block"><span className={label}>Naam</span>
                <input value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} className={field} /></label>
              <label className="block"><span className={label}>E-mail (voor de video-mails)</span>
                <input value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} placeholder="editor@mail.com" className={field} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={label}>Tarief / video (€)</span>
                  <input value={form.pay} onChange={(ev) => setForm({ ...form, pay: ev.target.value })} type="number" className={field} /></label>
                <label className="block"><span className={label}>Specialiteit</span>
                  <input value={form.specialty} onChange={(ev) => setForm({ ...form, specialty: ev.target.value })} placeholder="Reels / longform" className={field} /></label>
              </div>
              <label className="block"><span className={label}>Contact (WhatsApp/IG)</span>
                <input value={form.contact} onChange={(ev) => setForm({ ...form, contact: ev.target.value })} className={field} /></label>
              <label className="block"><span className={label}>Portfolio-link</span>
                <input value={form.portfolio} onChange={(ev) => setForm({ ...form, portfolio: ev.target.value })} placeholder="https://…" className={field} /></label>
              <div>
                <span className={label}>Zit op klant(en) — login ziet alleen deze borden</span>
                <div className="flex flex-wrap gap-1.5">
                  {clients.map((c) => {
                    const on = clientIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setClientIds((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                        className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                          on ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                  {clients.length === 0 && <span className="text-[12px] text-muted">Nog geen klanten.</span>}
                </div>
                <p className="text-[11px] text-muted mt-1">Niks aangevinkt = alle klanten zichtbaar (zoals nu).</p>
              </div>
              <label className="block"><span className={label}>Notities</span>
                <textarea value={form.notes} onChange={(ev) => setForm({ ...form, notes: ev.target.value })} rows={2} className={field + " resize-y"} /></label>

              {error && <p className="text-[13px] text-red-400">{error}</p>}
              {ok && <p className="text-[13px] text-emerald-400">{ok}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Sluiten</button>
                <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">{pending ? "…" : "Opslaan"}</button>
              </div>
              <button onClick={remove} disabled={pending} className="w-full rounded-xl border border-white/[0.08] hover:border-red-500/40 hover:text-red-400 py-2 text-[13px] text-muted transition-all">
                🗑 Editor verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
