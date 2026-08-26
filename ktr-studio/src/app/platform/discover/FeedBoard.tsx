"use client";

// ════════════════════════════════════════════════════════════════
// De ochtendscan-weergave: verse video's in drie bakjes (outliers /
// knowledge / concepten om te pakken), elk met samenvatting, link en
// een notitieveld voor Menno's mening — die notities zijn de
// grondstof voor scripts en eigen reels.
// ════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtNum } from "../_data";
import { saveFeedNoteAction, dismissFeedItemAction, saveFeedSourcesAction, runFeedScanAction } from "./actions";

export interface FeedItem {
  id: string;
  title: string;
  channel: string | null;
  url: string;
  views: number;
  outlier: number | null;
  category: string;
  summary: string | null;
  note: string | null;
}

const CATS: { key: string; title: string; hint: string; color: string }[] = [
  { key: "outlier", title: "🔥 Outliers", hint: "Doet het ≥2× de kanaal-mediaan — dit format werkt", color: "border-amber-400/25" },
  { key: "knowledge", title: "🧠 Knowledge", hint: "Uit je interesse-onderwerpen — ook buiten je niche", color: "border-sky-400/25" },
  { key: "concept", title: "🎯 Concept pakken", hint: "Vers van je volglijst — leen het format, niet de hype", color: "border-emerald-400/25" },
];

export function FeedBoard({ items, channels, topics }: { items: FeedItem[]; channels: string; topics: string }) {
  const [list, setList] = useState(items);
  const [showSettings, setShowSettings] = useState(items.length === 0);
  const [ch, setCh] = useState(channels);
  const [tp, setTp] = useState(topics);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function saveSources() {
    start(async () => {
      const r = await saveFeedSourcesAction(ch, tp);
      setMsg(r.error ?? r.ok ?? null);
    });
  }

  function scanNow() {
    setMsg("Scannen… (kan een halve minuut duren)");
    start(async () => {
      const r = await runFeedScanAction();
      setMsg(r.error ?? r.ok ?? null);
    });
  }

  function saveNote(id: string, note: string) {
    saveFeedNoteAction(id, note).catch(() => undefined);
  }

  function dismiss(id: string) {
    setList((l) => l.filter((x) => x.id !== id));
    dismissFeedItemAction(id).catch(() => undefined);
  }

  return (
    <Card className="p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Elke ochtend vers</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Ochtendscan</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings((s) => !s)} className="rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-2 text-[13px] transition-all">
            ⚙ Bronnen
          </button>
          <button onClick={scanNow} disabled={pending} className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-[13px] px-3.5 py-2 transition-colors">
            {pending ? "Bezig…" : "↻ Scan nu"}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-5 rounded-xl border border-white/[0.08] p-4 space-y-3">
          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Volglijst (YouTube-handles, komma-gescheiden)</span>
            <input value={ch} onChange={(e) => setCh(e.target.value)} placeholder="@AlexHormozi, @FilmBooth, @…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Interesse-onderwerpen (max 2, komma-gescheiden — mag buiten je niche)</span>
            <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="youtube groeien, personal brand"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-accent/40" />
          </label>
          <button onClick={saveSources} disabled={pending} className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-[13px] px-4 py-2 transition-colors">
            Bronnen opslaan
          </button>
        </div>
      )}
      {msg && <p className="text-[12.5px] text-accent mb-3">{msg}</p>}

      {list.length === 0 ? (
        <p className="text-[13px] text-muted">
          Nog niks verzameld. Stel je volglijst en onderwerpen in via ⚙ en klik &ldquo;Scan nu&rdquo; — daarna vult de bewaker
          dit elke ochtend automatisch en krijg je een melding als er nieuwe video&rsquo;s klaarstaan.
        </p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {CATS.map((cat) => {
            const inCat = list.filter((i) => i.category === cat.key);
            return (
              <div key={cat.key}>
                <div className="mb-2">
                  <div className="font-display font-bold text-sm">{cat.title} <span className="font-mono text-[11px] text-muted">{inCat.length}</span></div>
                  <div className="text-[11px] text-muted">{cat.hint}</div>
                </div>
                <div className="space-y-2.5">
                  {inCat.length === 0 && <div className="rounded-xl border border-dashed border-white/[0.06] px-3 py-4 text-center text-[12px] text-muted">Leeg</div>}
                  {inCat.map((i) => (
                    <div key={i.id} className={`rounded-xl border ${cat.color} bg-white/[0.015] p-3`}>
                      <div className="flex items-start justify-between gap-2">
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium leading-snug hover:text-accent transition-colors">
                          {i.title} ↗
                        </a>
                        <button onClick={() => dismiss(i.id)} title="Weghalen" className="shrink-0 text-muted/60 hover:text-red-400 text-sm leading-none">×</button>
                      </div>
                      <div className="text-[11px] text-muted mt-1">
                        {i.channel} · {fmtNum(i.views)} views{i.outlier ? ` · ${i.outlier}× mediaan` : ""}
                      </div>
                      {i.summary && <p className="text-[12px] text-foreground/80 leading-relaxed mt-2">{i.summary}</p>}
                      <textarea
                        defaultValue={i.note ?? ""}
                        onBlur={(e) => saveNote(i.id, e.target.value)}
                        placeholder="Jouw take: mee eens / oneens, wat pak je ervan voor je eigen content?"
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-[12px] outline-none focus:border-accent/40 resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
