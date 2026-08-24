"use client";

import { useState, useTransition } from "react";
import { Card, Badge } from "../_components";
import { createFormAction, toggleFormAction, deleteFormAction } from "./actions";

export interface FormRow {
  id: string;
  name: string;
  token: string;
  clientId: string | null;
  clientName: string | null;
  active: boolean;
  submissions: number;
}

// Zelfde origin als waar je nu ingelogd bent — blijft goed na een domeinwissel.
const site = () => (typeof window === "undefined" ? "" : window.location.origin);

export function FormsBoard({ initial, clients }: { initial: FormRow[]; clients: { id: string; label: string }[] }) {
  const [forms, setForms] = useState(initial);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    clientId: clients[0]?.id ?? "",
    headline: "",
    intro: "",
    buttonLabel: "Versturen",
    askPhone: false,
    askInstagram: true,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      const r = await createFormAction({
        name: form.name,
        clientId: form.clientId || null,
        headline: form.headline,
        intro: form.intro,
        buttonLabel: form.buttonLabel,
        askPhone: form.askPhone,
        askInstagram: form.askInstagram,
      });
      if (r.error) setError(r.error);
      else {
        setError("");
        setForms((cur) => [
          {
            id: `tmp-${cur.length}`,
            name: form.name,
            token: r.token!,
            clientId: form.clientId || null,
            clientName: clients.find((c) => c.id === form.clientId)?.label ?? null,
            active: true,
            submissions: 0,
          },
          ...cur,
        ]);
        setForm({ ...form, name: "", headline: "", intro: "" });
        setOpen(false);
      }
    });
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${site()}/f/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  function toggle(id: string, active: boolean) {
    setForms((cur) => cur.map((f) => (f.id === id ? { ...f, active } : f)));
    start(async () => {
      await toggleFormAction(id, active);
    });
  }

  function remove(id: string) {
    if (!confirm("Formulier verwijderen? De publieke link werkt daarna niet meer.")) return;
    setForms((cur) => cur.filter((f) => f.id !== id));
    start(async () => {
      await deleteFormAction(id);
    });
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-muted max-w-lg">
          Maak een formulier, deel de link in je bio of DM, en elke inzending komt binnen als lead bij de juiste klant.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors shrink-0"
        >
          + Nieuw formulier
        </button>
      </div>

      {forms.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Nog geen formulieren. Handig voor een gids, een gratis audit of een wachtlijst — je krijgt een link die je
            overal kunt delen.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {forms.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="text-[12px] text-muted">{f.clientName ?? "Geen klant gekoppeld"}</div>
                </div>
                <Badge color={f.active ? "#34D399" : "#6B7280"}>{f.active ? "live" : "uit"}</Badge>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 mb-3">
                <code className="text-[12px] text-muted truncate flex-1">/f/{f.token}</code>
                <button
                  onClick={() => copyLink(f.token)}
                  className="text-[12px] text-accent hover:text-accent-hover transition-colors shrink-0"
                >
                  {copied === f.token ? "Gekopieerd ✓" : "Kopieer"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px]">
                  <strong className="font-display font-extrabold text-lg">{f.submissions}</strong>
                  <span className="text-muted ml-1.5">inzendingen</span>
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/f/${f.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
                  >
                    Bekijk
                  </a>
                  <button
                    onClick={() => toggle(f.id, !f.active)}
                    disabled={f.id.startsWith("tmp-")}
                    className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
                  >
                    {f.active ? "Uitzetten" : "Aanzetten"}
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    disabled={f.id.startsWith("tmp-")}
                    className="rounded-lg border border-white/[0.08] hover:border-red-500/40 hover:text-red-400 px-2.5 py-1.5 text-[12px] text-muted transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">Nieuw formulier</h3>
            <div className="space-y-3.5">
              <label className="block">
                <span className={label}>Naam (intern)</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gratis audit-aanvraag" className={field} />
              </label>
              <label className="block">
                <span className={label}>Voor welke klant</span>
                <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={field}>
                  <option value="" className="bg-card">— geen klant —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Kop op de pagina</span>
                <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Vraag je gratis audit aan" className={field} />
              </label>
              <label className="block">
                <span className={label}>Introtekst</span>
                <textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} rows={3} placeholder="Laat je gegevens achter en je hoort binnen 24 uur van ons." className={field + " resize-y"} />
              </label>
              <label className="block">
                <span className={label}>Knoptekst</span>
                <input value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} className={field} />
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.askInstagram} onChange={(e) => setForm({ ...form, askInstagram: e.target.checked })} className="accent-[var(--accent)] w-4 h-4" />
                  Vraag Instagram
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.askPhone} onChange={(e) => setForm({ ...form, askPhone: e.target.checked })} className="accent-[var(--accent)] w-4 h-4" />
                  Vraag telefoon
                </label>
              </div>

              {error && <p className="text-[13px] text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Annuleren</button>
                <button onClick={create} disabled={pending || !form.name.trim()} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm py-2.5 transition-colors">
                  {pending ? "…" : "Aanmaken"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
