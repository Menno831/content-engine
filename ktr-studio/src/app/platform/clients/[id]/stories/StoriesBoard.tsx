"use client";

// Stories-tracking: per dag een reeks slides. Je typt de cijfers uit de
// Instagram-app over; drop-off en link-% rekenen we zelf uit. Alles slaat
// zichzelf op (±0,8s na de laatste toetsaanslag).

import { useMemo, useRef, useState, useTransition } from "react";
import { Card } from "../../../_components";
import { fmtNum } from "../../../_data";
import {
  addStoryDayAction,
  addStorySlideAction,
  updateStorySlideAction,
  deleteStorySlideAction,
  deleteStoryDayAction,
} from "../actions";
import type { StoryMonth, StorySequence, StorySlide } from "@/lib/workspace";

const TYPES = ["Aesthetic", "Waarde", "Verhaal", "CTA", "Poll"];

export function StoriesBoard({
  clientId,
  month,
  initial,
}: {
  clientId: string;
  month: string;
  initial: StoryMonth;
}) {
  const [sequences, setSequences] = useState<StorySequence[]>(initial.sequences);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, start] = useTransition();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Totalen live meerekenen, zodat de tegels meteen kloppen bij typen.
  const totals = useMemo(() => {
    let views = 0;
    let replies = 0;
    let likes = 0;
    let slides = 0;
    const drops: number[] = [];
    const links: number[] = [];
    for (const seq of sequences) {
      for (const sl of seq.slides) {
        views += sl.views;
        replies += sl.replies;
        likes += sl.likes;
        slides += 1;
        if (sl.views > 0) links.push((sl.linkClicks / sl.views) * 100);
      }
      const first = seq.slides[0]?.views ?? 0;
      const last = seq.slides[seq.slides.length - 1]?.views ?? 0;
      if (first > 0 && seq.slides.length > 1) drops.push(((first - last) / first) * 100);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);
    return {
      views,
      replies,
      likes,
      slides,
      avgDropOff: Math.round(avg(drops) * 10) / 10,
      avgLinkClick: Math.round(avg(links) * 10) / 10,
    };
  }, [sequences]);

  function patchSlide(seqId: string, slideId: string, patch: Partial<StorySlide>) {
    setSequences((cur) =>
      cur.map((s) =>
        s.id === seqId ? { ...s, slides: s.slides.map((sl) => (sl.id === slideId ? { ...sl, ...patch } : sl)) } : s
      )
    );
    setSaved("saving");
    const old = timers.current.get(slideId);
    if (old) clearTimeout(old);
    timers.current.set(
      slideId,
      setTimeout(() => {
        start(async () => {
          const r = await updateStorySlideAction(clientId, slideId, {
            slide_type: patch.slideType ?? undefined,
            cta: patch.cta ?? undefined,
            note: patch.note ?? undefined,
            views: patch.views,
            link_clicks: patch.linkClicks,
            replies: patch.replies,
            likes: patch.likes,
          });
          setSaved(r.error ? "idle" : "saved");
          if (r.error) setError(r.error);
        });
      }, 800)
    );
  }

  function addDay() {
    start(async () => {
      const r = await addStoryDayAction(clientId, newDate);
      if (r.error) setError(r.error);
      else {
        setError("");
        setSequences((cur) =>
          [{ id: r.id!, date: newDate, slides: [] }, ...cur].sort((a, b) => b.date.localeCompare(a.date))
        );
      }
    });
  }

  function addSlide(seq: StorySequence) {
    const position = seq.slides.length + 1;
    start(async () => {
      const r = await addStorySlideAction(clientId, seq.id, position);
      if (r.error) setError(r.error);
      else {
        // Lokaal tonen; bij de volgende load komt het echte id mee.
        setSequences((cur) =>
          cur.map((s) =>
            s.id === seq.id
              ? {
                  ...s,
                  slides: [
                    ...s.slides,
                    { id: `tmp-${seq.id}-${position}`, position, slideType: null, cta: null, views: 0, linkClicks: 0, replies: 0, likes: 0, note: null },
                  ],
                }
              : s
          )
        );
      }
    });
  }

  function removeSlide(seqId: string, slideId: string) {
    setSequences((cur) => cur.map((s) => (s.id === seqId ? { ...s, slides: s.slides.filter((sl) => sl.id !== slideId) } : s)));
    start(async () => {
      await deleteStorySlideAction(clientId, slideId);
    });
  }

  function removeDay(seqId: string) {
    if (!confirm("Deze dag en alle slides verwijderen?")) return;
    setSequences((cur) => cur.filter((s) => s.id !== seqId));
    start(async () => {
      await deleteStoryDayAction(clientId, seqId);
    });
  }

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Tile label={`Views · ${monthLabel}`} value={fmtNum(totals.views)} />
        <Tile label="Gem. drop-off" value={`${totals.avgDropOff}%`} hint="eerste slide → laatste" />
        <Tile label="Gem. link-klik" value={`${totals.avgLinkClick}%`} />
        <Tile label="Reacties" value={fmtNum(totals.replies)} />
        <Tile label="Likes" value={fmtNum(totals.likes)} />
        <Tile label="Slides gelogd" value={String(totals.slides)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
        />
        <button
          onClick={addDay}
          disabled={pending}
          className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2 transition-colors"
        >
          + Dag toevoegen
        </button>
        <span className={`text-[12px] font-mono ${saved === "saved" ? "text-emerald-400" : "text-muted"}`}>
          {saved === "saving" ? "Opslaan…" : saved === "saved" ? "Opgeslagen ✓" : ""}
        </span>
        {error && <span className="text-[12.5px] text-red-400">{error}</span>}
      </div>

      {sequences.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Nog geen stories gelogd deze maand. Kies een datum en klik &ldquo;Dag toevoegen&rdquo; — daarna vul je per slide de
            views, link-klikken en reacties in en zie je meteen waar mensen afhaken.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => {
            const first = seq.slides[0]?.views ?? 0;
            return (
              <Card key={seq.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-extrabold">
                      {new Date(seq.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" })}
                    </span>
                    <span className="text-[12px] text-muted">
                      {seq.slides.length} slide{seq.slides.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addSlide(seq)}
                      className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[12px] text-muted transition-all"
                    >
                      + Slide
                    </button>
                    <button
                      onClick={() => removeDay(seq.id)}
                      className="rounded-lg border border-white/[0.08] hover:border-red-500/40 hover:text-red-400 px-2.5 py-1.5 text-[12px] text-muted transition-all"
                    >
                      Dag weg
                    </button>
                  </div>
                </div>

                {seq.slides.length === 0 ? (
                  <p className="text-[12.5px] text-muted">Nog geen slides — klik &ldquo;+ Slide&rdquo;.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] min-w-[760px]">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase tracking-wider text-muted">
                          <th className="text-left font-normal pb-2 w-16">Slide</th>
                          <th className="text-left font-normal pb-2 w-32">Type</th>
                          <th className="text-left font-normal pb-2 w-28">CTA</th>
                          <th className="text-right font-normal pb-2 w-24">Views</th>
                          <th className="text-right font-normal pb-2 w-24">Drop-off</th>
                          <th className="text-right font-normal pb-2 w-24">Link-klik</th>
                          <th className="text-right font-normal pb-2 w-20">Link %</th>
                          <th className="text-right font-normal pb-2 w-20">Reacties</th>
                          <th className="text-right font-normal pb-2 w-20">Likes</th>
                          <th className="pb-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {seq.slides.map((sl, i) => {
                          const prev = i > 0 ? seq.slides[i - 1].views : null;
                          const drop = prev && prev > 0 ? ((prev - sl.views) / prev) * 100 : null;
                          const linkPct = sl.views > 0 ? (sl.linkClicks / sl.views) * 100 : 0;
                          const vsFirst = first > 0 ? Math.round((sl.views / first) * 100) : 0;
                          return (
                            <tr key={sl.id} className="border-t border-white/[0.05] group">
                              <td className="py-1.5 pr-2">
                                <span className="font-medium">{i + 1}</span>
                                {i > 0 && <span className="text-[11px] text-muted ml-1.5">{vsFirst}%</span>}
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  list="story-types"
                                  value={sl.slideType ?? ""}
                                  onChange={(e) => patchSlide(seq.id, sl.id, { slideType: e.target.value })}
                                  placeholder="type"
                                  className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[12.5px] outline-none focus:border-accent/40"
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  value={sl.cta ?? ""}
                                  onChange={(e) => patchSlide(seq.id, sl.id, { cta: e.target.value })}
                                  placeholder="—"
                                  className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[12.5px] outline-none focus:border-accent/40"
                                />
                              </td>
                              <Num value={sl.views} onChange={(v) => patchSlide(seq.id, sl.id, { views: v })} />
                              <td className="py-1.5 pr-2 text-right font-mono text-[12.5px]">
                                {drop == null ? (
                                  <span className="text-muted">—</span>
                                ) : (
                                  <span className={drop > 30 ? "text-red-400" : drop > 15 ? "text-amber-300" : "text-emerald-400"}>
                                    {drop.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                              <Num value={sl.linkClicks} onChange={(v) => patchSlide(seq.id, sl.id, { linkClicks: v })} />
                              <td className="py-1.5 pr-2 text-right font-mono text-[12.5px] text-emerald-400">
                                {linkPct.toFixed(1)}%
                              </td>
                              <Num value={sl.replies} onChange={(v) => patchSlide(seq.id, sl.id, { replies: v })} />
                              <Num value={sl.likes} onChange={(v) => patchSlide(seq.id, sl.id, { likes: v })} />
                              <td className="py-1.5 text-right">
                                <button
                                  onClick={() => removeSlide(seq.id, sl.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all"
                                  title="Slide weg"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <datalist id="story-types">
        {TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  );
}

function Num({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <td className="py-1.5 pr-2">
      <input
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        type="number"
        placeholder="0"
        className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[12.5px] text-right outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </td>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className="font-display font-extrabold text-2xl">{value}</div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </Card>
  );
}
