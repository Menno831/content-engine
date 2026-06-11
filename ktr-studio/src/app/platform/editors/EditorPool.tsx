"use client";

import { useState, useTransition } from "react";
import { Card, Avatar, Badge } from "../_components";
import { fmtEur, type Editor } from "../_data";
import { updateEditorPoolAction } from "./actions";

const POOL = ["actief", "pool", "gestopt"] as const;
const poolColor: Record<string, string> = { actief: "#34D399", pool: "#FBBF24", gestopt: "#6B7280" };

export function EditorPool({ editors }: { editors: Editor[] }) {
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
