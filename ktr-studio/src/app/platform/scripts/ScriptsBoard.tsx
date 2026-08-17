"use client";

// ════════════════════════════════════════════════════════════════
// Scripts-bibliotheek: lijst links (gefilterd op status/tag), editor
// rechts. Alles wat je typt wordt na ±0,8s automatisch opgeslagen —
// geen opslaan-knop nodig, de indicator laat zien wanneer het staat.
// ════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, Badge } from "../_components";
import { createScriptAction, updateScriptAction, deleteScriptAction } from "./actions";

export interface ScriptRow {
  id: string;
  title: string;
  content: string | null;
  status: string; // to_write | to_record | recorded
  tag: string | null;
  client_id: string | null;
  updated_at: string;
}

const STATUS = [
  { id: "to_write", label: "Nog schrijven", color: "#FBBF24" },
  { id: "to_record", label: "Klaar om op te nemen", color: "#F97316" },
  { id: "recorded", label: "Opgenomen", color: "#34D399" },
];

const statusMeta = Object.fromEntries(STATUS.map((s) => [s.id, s]));

export function ScriptsBoard({ initial, clients }: { initial: ScriptRow[]; clients: { id: string; name: string }[] }) {
  const [scripts, setScripts] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [filter, setFilter] = useState<string>("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingNew, startNew] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = scripts.find((s) => s.id === activeId) ?? null;
  const shown = useMemo(
    () => (filter ? scripts.filter((s) => s.status === filter) : scripts),
    [scripts, filter]
  );

  // Debounced autosave: lokaal bijwerken, na 0,8s naar de server.
  function patch(id: string, p: Partial<ScriptRow>) {
    setScripts((cur) => cur.map((s) => (s.id === id ? { ...s, ...p } : s)));
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await updateScriptAction(id, {
        title: p.title,
        content: p.content ?? undefined,
        status: p.status,
        tag: p.tag ?? undefined,
        client_id: p.client_id,
      });
      setSaved(r.error ? "error" : "saved");
    }, 800);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function addScript() {
    startNew(async () => {
      const r = await createScriptAction();
      if (r.id) {
        const row: ScriptRow = {
          id: r.id,
          title: "Nieuw script",
          content: "",
          status: "to_write",
          tag: null,
          client_id: null,
          updated_at: new Date().toISOString(),
        };
        setScripts((cur) => [row, ...cur]);
        setActiveId(r.id);
      }
    });
  }

  async function removeScript(id: string) {
    if (!confirm("Script verwijderen? Dit kan niet ongedaan worden.")) return;
    const r = await deleteScriptAction(id);
    if (!r.error) {
      setScripts((cur) => cur.filter((s) => s.id !== id));
      if (activeId === id) setActiveId(null);
    }
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      {/* Lijst */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={addScript}
            disabled={pendingNew}
            className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2 transition-colors"
          >
            {pendingNew ? "…" : "+ Nieuw script"}
          </button>
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <FilterPill active={!filter} label={`Alle (${scripts.length})`} onClick={() => setFilter("")} />
          {STATUS.map((s) => (
            <FilterPill
              key={s.id}
              active={filter === s.id}
              label={`${s.label} (${scripts.filter((x) => x.status === s.id).length})`}
              onClick={() => setFilter(s.id)}
            />
          ))}
        </div>
        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {shown.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-all ${
                s.id === activeId
                  ? "border-accent/40 bg-accent/[0.06]"
                  : "border-white/[0.06] bg-card hover:border-white/[0.14]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{s.title}</span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusMeta[s.status]?.color ?? "#6B7280" }} />
              </div>
              <div className="text-[11px] text-muted mt-0.5 truncate">
                {s.tag && <span className="text-accent">#{s.tag} · </span>}
                {(s.content ?? "").slice(0, 60) || "Nog leeg"}
              </div>
            </button>
          ))}
          {shown.length === 0 && <p className="text-[12px] text-muted py-6 text-center">Nog geen scripts hier.</p>}
        </div>
      </div>

      {/* Editor */}
      {active ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              value={active.title}
              onChange={(e) => patch(active.id, { title: e.target.value })}
              className="flex-1 min-w-[200px] bg-transparent font-display font-extrabold text-xl outline-none border-b border-transparent focus:border-accent/40 transition-colors"
            />
            <span className={`text-[11px] font-mono ${saved === "error" ? "text-red-400" : saved === "saving" ? "text-muted" : "text-emerald-400"}`}>
              {saved === "saving" ? "Opslaan…" : saved === "error" ? "Opslaan mislukt" : saved === "saved" ? "Opgeslagen ✓" : ""}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={active.status}
              onChange={(e) => patch(active.id, { status: e.target.value })}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/40"
            >
              {STATUS.map((s) => (
                <option key={s.id} value={s.id} className="bg-card">{s.label}</option>
              ))}
            </select>
            <input
              value={active.tag ?? ""}
              onChange={(e) => patch(active.id, { tag: e.target.value })}
              placeholder="Tag (bv. Mexico)"
              className="w-36 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/40"
            />
            <select
              value={active.client_id ?? ""}
              onChange={(e) => patch(active.id, { client_id: e.target.value || null })}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/40"
            >
              <option value="" className="bg-card">Eigen kanaal</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => removeScript(active.id)}
              className="ml-auto rounded-lg border border-white/[0.08] hover:border-red-500/40 hover:text-red-400 px-2.5 py-1.5 text-[13px] text-muted transition-all"
            >
              🗑 Verwijderen
            </button>
          </div>

          <textarea
            value={active.content ?? ""}
            onChange={(e) => patch(active.id, { content: e.target.value })}
            placeholder={"Hook:\n\nScript:\n\nCTA:"}
            rows={22}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-[14px] leading-relaxed outline-none focus:border-accent/40 transition-colors resize-y font-[inherit]"
          />
          {active.status === "recorded" && (
            <p className="mt-2 text-[12px] text-muted">
              Opgenomen ✓ — zet &lsquo;m op het productieboard via <Badge color="#F97316">Add card</Badge> zodra de edit kan starten.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-10 grid place-items-center text-sm text-muted">
          Kies links een script — of maak een nieuwe aan.
        </Card>
      )}
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11.5px] transition-all ${
        active ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}
