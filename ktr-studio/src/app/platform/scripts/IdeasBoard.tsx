"use client";

// ════════════════════════════════════════════════════════════════
// Ideeën die uit je eigen calls en gesprekken komen. Elk idee draagt
// z'n bron, dus je ziet altijd waar het vandaan komt. Eén klik maakt
// er een script van met jouw vaste structuur erin.
// ════════════════════════════════════════════════════════════════

import { useMemo, useState, useTransition } from "react";
import { Card } from "../_components";
import { PILLARS, PILLAR_COLOR, IDEA_STATUS, type ContentIdea, type IdeaSource } from "@/lib/ideas-shared";
import { setIdeaStatusAction, deleteIdeaAction, ideaToScriptAction, generateIdeasAction, addSourceAction } from "./ideaActions";

export function IdeasBoard({
  ideas,
  sources,
  onOpenScript,
}: {
  ideas: ContentIdea[];
  sources: IdeaSource[];
  onOpenScript?: (scriptId: string) => void;
}) {
  const [pillar, setPillar] = useState("");
  const [status, setStatus] = useState("nieuw");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showSources, setShowSources] = useState(false);

  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const shown = useMemo(
    () =>
      ideas
        .filter((i) => (pillar ? i.pillar === pillar : true))
        .filter((i) => (status ? i.status === status : true)),
    [ideas, pillar, status]
  );

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.error) setMsg({ ok: false, text: r.error });
      else if (r.message) setMsg({ ok: true, text: r.message });
    });
  }

  return (
    <div>
      {/* Kop met de generatieknop */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl">Ideeën uit je eigen gesprekken</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Gevoed door {sources.length} {sources.length === 1 ? "bron" : "bronnen"} — calls, notities, gesprekken.
            Elk idee laat zien waar het vandaan komt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3.5 py-2.5 text-sm transition-all"
          >
            Bronnen ({sources.length})
          </button>
          <button
            onClick={() => run(generateIdeasAction)}
            disabled={busy}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2.5 transition-colors"
          >
            {busy ? "Denken…" : "✦ Nieuwe ideeën"}
          </button>
        </div>
      </div>

      {msg && (
        <p className={`mb-3 text-[13px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      {showSources && <SourcesPanel sources={sources} onDone={(t) => setMsg(t)} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Pill active={!status} label={`Alles (${ideas.length})`} onClick={() => setStatus("")} />
        {IDEA_STATUS.map((s) => (
          <Pill
            key={s.id}
            active={status === s.id}
            label={`${s.label} (${ideas.filter((i) => i.status === s.id).length})`}
            onClick={() => setStatus(s.id)}
          />
        ))}
        <span className="w-px h-6 bg-white/[0.08] mx-1 self-center" />
        <Pill active={!pillar} label="Alle pijlers" onClick={() => setPillar("")} />
        {PILLARS.map((p) => (
          <Pill
            key={p}
            active={pillar === p}
            label={p}
            color={PILLAR_COLOR[p]}
            onClick={() => setPillar(p)}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            {ideas.length === 0
              ? "Nog geen ideeën. Voeg een call of gesprek toe als bron en klik op ✦ Nieuwe ideeën."
              : "Geen ideeën in deze selectie."}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((idea) => {
            const src = idea.sourceId ? sourceById.get(idea.sourceId) : null;
            return (
              <Card key={idea.id} className="p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2.5">
                  {idea.pillar && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-mono"
                      style={{
                        background: `${PILLAR_COLOR[idea.pillar] ?? "#8A8F98"}22`,
                        color: PILLAR_COLOR[idea.pillar] ?? "#8A8F98",
                      }}
                    >
                      {idea.pillar}
                    </span>
                  )}
                  {idea.format && (
                    <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-mono text-muted">
                      {idea.format}
                    </span>
                  )}
                </div>

                <h3 className="font-medium text-[15px] leading-snug mb-2">{idea.title}</h3>

                {idea.hook && (
                  <p className="text-[13px] text-foreground/85 leading-relaxed mb-2 border-l-2 border-accent/40 pl-3">
                    &ldquo;{idea.hook}&rdquo;
                  </p>
                )}
                {idea.angle && <p className="text-[12.5px] text-muted leading-relaxed mb-3">{idea.angle}</p>}

                {/* Waar dit vandaan komt */}
                {(src || idea.sourceNote) && (
                  <p className="text-[11px] text-muted/80 mb-3">
                    ↩︎{" "}
                    {idea.sourceUrl || src?.url ? (
                      <a href={idea.sourceUrl ?? src?.url ?? "#"} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors underline decoration-white/20">
                        {idea.sourceNote ?? src?.title}
                      </a>
                    ) : (
                      idea.sourceNote ?? src?.title
                    )}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-1.5 pt-3 border-t border-white/[0.05]">
                  {idea.status !== "gemaakt" && idea.status !== "gedaan" && (
                    <button
                      onClick={() =>
                        run(async () => {
                          const r = await ideaToScriptAction(idea.id);
                          if (r.scriptId) onOpenScript?.(r.scriptId);
                          return r;
                        })
                      }
                      disabled={busy}
                      className="rounded-lg bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent font-bold text-[11.5px] px-2.5 py-1.5 transition-colors"
                    >
                      → Maak script
                    </button>
                  )}
                  {idea.status === "nieuw" && (
                    <button
                      onClick={() => run(() => setIdeaStatusAction(idea.id, "gekozen"))}
                      disabled={busy}
                      className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent text-[11.5px] px-2.5 py-1.5 text-muted transition-all"
                    >
                      Bewaren
                    </button>
                  )}
                  {idea.status !== "gedaan" ? (
                    <button
                      onClick={() => run(() => setIdeaStatusAction(idea.id, "gedaan"))}
                      disabled={busy}
                      title="Deze heb ik al gemaakt"
                      className="rounded-lg border border-white/[0.08] hover:border-emerald-400/40 hover:text-emerald-400 text-[11.5px] px-2.5 py-1.5 text-muted transition-all"
                    >
                      ✓ Al gedaan
                    </button>
                  ) : (
                    <button
                      onClick={() => run(() => setIdeaStatusAction(idea.id, "nieuw"))}
                      disabled={busy}
                      className="rounded-lg border border-emerald-400/30 text-emerald-400 text-[11.5px] px-2.5 py-1.5 transition-all"
                    >
                      ✓ Gedaan — terugzetten
                    </button>
                  )}
                  {idea.status !== "afgewezen" ? (
                    <button
                      onClick={() => run(() => setIdeaStatusAction(idea.id, "afgewezen"))}
                      disabled={busy}
                      className="ml-auto rounded-lg border border-white/[0.08] hover:border-red-400/40 hover:text-red-400 text-[11.5px] px-2.5 py-1.5 text-muted transition-all"
                    >
                      Niks voor mij
                    </button>
                  ) : (
                    <button
                      onClick={() => run(() => deleteIdeaAction(idea.id))}
                      disabled={busy}
                      className="ml-auto rounded-lg border border-white/[0.08] hover:border-red-400/40 hover:text-red-400 text-[11.5px] px-2.5 py-1.5 text-muted transition-all"
                    >
                      Weg
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ active, label, onClick, color }: { active: boolean; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] transition-all ${
        active ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {color && !active && <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ background: color }} />}
      {label}
    </button>
  );
}

// ── Bronnen: wat voedt de ideeën ────────────────────────────────
function SourcesPanel({ sources, onDone }: { sources: IdeaSource[]; onDone: (m: { ok: boolean; text: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [form, setForm] = useState({ title: "", kind: "call", happenedOn: "", url: "", content: "" });

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-bold">Waar de ideeën vandaan komen</h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1 text-[12px] text-muted transition-all"
        >
          {open ? "Sluiten" : "+ Bron toevoegen"}
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="text-[12.5px] text-muted">Nog geen bronnen.</p>
      ) : (
        <div className="space-y-1">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-[13px] py-1">
              <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-mono text-muted shrink-0">{s.kind}</span>
              <span className="min-w-0 flex-1 truncate">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </span>
              <span className="text-[11.5px] text-muted shrink-0">{s.happenedOn ?? ""}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titel, bv. Call met Seth" className={field} />
            <input value={form.happenedOn} onChange={(e) => setForm({ ...form, happenedOn: e.target.value })} type="date" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={field}>
              <option value="call" className="bg-card">Call</option>
              <option value="notitie" className="bg-card">Notitie</option>
              <option value="chat" className="bg-card">Chat</option>
              <option value="transcript" className="bg-card">Transcript</option>
            </select>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Link naar de opname (optioneel)" className={field} />
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={6}
            placeholder="Plak de samenvatting of het transcript. Hoe concreter, hoe beter de ideeën."
            className={`${field} resize-y`}
          />
          <button
            onClick={() =>
              start(async () => {
                const r = await addSourceAction(form);
                if (r.error) onDone({ ok: false, text: r.error });
                else {
                  onDone({ ok: true, text: r.message ?? "Bron toegevoegd." });
                  setForm({ title: "", kind: "call", happenedOn: "", url: "", content: "" });
                  setOpen(false);
                }
              })
            }
            disabled={busy}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2.5 transition-colors"
          >
            {busy ? "Opslaan…" : "Bron opslaan"}
          </button>
        </div>
      )}
    </Card>
  );
}
