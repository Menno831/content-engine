"use client";

// Alle vaste links van een klant op één plek: ruwe footage, merkmap,
// Frame-project, inlogportalen. Scheelt zoeken in WhatsApp.

import { useState, useTransition } from "react";
import { Card } from "../../../_components";
import { addClientLinkAction, deleteClientLinkAction } from "../actions";
import type { ClientLink } from "@/lib/workspace";

const CATEGORIES = ["Footage", "Merk", "Tools", "Anders"];

export function LinksBoard({ clientId, initial }: { clientId: string; initial: ClientLink[] }) {
  const [links, setLinks] = useState(initial);
  const [form, setForm] = useState({ label: "", url: "", category: "Footage" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!form.label.trim() || !form.url.trim()) return;
    start(async () => {
      const r = await addClientLinkAction(clientId, form.label, form.url, form.category);
      if (r.error) setError(r.error);
      else {
        setError("");
        setLinks((cur) => [
          ...cur,
          { id: `tmp-${cur.length}`, label: form.label.trim(), url: form.url.trim(), category: form.category },
        ]);
        setForm({ label: "", url: "", category: form.category });
      }
    });
  }

  function remove(id: string) {
    setLinks((cur) => cur.filter((l) => l.id !== id));
    start(async () => {
      await deleteClientLinkAction(clientId, id);
    });
  }

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: links.filter((l) => (l.category ?? "Anders") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Naam (bv. Ruwe footage augustus)"
            className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="https://…"
            className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="sm:w-32 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={pending || !form.label.trim() || !form.url.trim()}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-5 py-2.5 transition-colors"
          >
            + Link
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
      </Card>

      {links.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Nog geen links. Zet hier de Drive-map met ruwe footage, de merkmap, het Frame-project — alles wat je editor
            of jijzelf steeds moet opzoeken.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {grouped.map((g) => (
            <Card key={g.cat} className="p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-3">{g.cat}</div>
              <div className="space-y-1">
                {g.items.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate hover:text-accent transition-colors"
                      title={l.url}
                    >
                      ↗ {l.label}
                    </a>
                    <button
                      onClick={() => remove(l.id)}
                      disabled={l.id.startsWith("tmp-")}
                      className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all disabled:opacity-0 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
