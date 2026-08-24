"use client";

// ════════════════════════════════════════════════════════════════
// Gantt: de planning op een tijdlijn. Elke kaart is een balk van
// deadline (aanleveren) tot postingdatum (live). Staat er maar één
// datum, dan wordt het een stip op die dag.
//
// Geen externe library — de balken zijn CSS-grid op een dagraster.
// ════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContentCard } from "../_data";

const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function GanttBoard({
  cards,
  formatColor,
  stageLabels,
}: {
  cards: ContentCard[];
  formatColor: Record<string, string>;
  stageLabels: Record<string, string>;
}) {
  const [weeks, setWeeks] = useState(6);

  const model = useMemo(() => {
    // Vensterstart: maandag van vórige week. Die extra week geschiedenis
    // is bewust: kaarten die net over tijd zijn moeten in beeld blijven,
    // anders verdwijnt juist het werk waar je achteraan moet.
    const today = startOfDay(new Date());
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7);
    const from = monday.getTime();
    const dayCount = (weeks + 1) * 7;
    const to = from + dayCount * DAY;

    const rows = cards
      .map((c) => {
        const dl = c.deadlineISO ? startOfDay(new Date(c.deadlineISO)).getTime() : null;
        const post = c.postingISO ? startOfDay(new Date(c.postingISO)).getTime() : null;
        const fallback = c.dateISO ? startOfDay(new Date(c.dateISO)).getTime() : null;

        // Balk: van de vroegste naar de laatste bekende datum.
        const known = [dl, post, fallback].filter((n): n is number => n != null);
        if (!known.length) return null;
        const start = Math.min(...known);
        const end = Math.max(...known);
        if (end < from || start > to) return null; // buiten beeld

        return { card: c, start, end, hasRange: dl != null && post != null && dl !== post };
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => a.start - b.start);

    const dayCols = Array.from({ length: dayCount }, (_, i) => new Date(from + i * DAY));

    return { from, to, rows, dayCols, dayCount, today: today.getTime() };
  }, [cards, weeks]);

  const { from, rows, dayCols, dayCount, today } = model;

  // Positie van een balk in dagkolommen (1-based voor CSS-grid).
  const colOf = (t: number) => Math.min(dayCount, Math.max(1, Math.floor((t - from) / DAY) + 1));

  const monthSpans = useMemo(() => {
    const spans: { label: string; days: number }[] = [];
    for (const d of dayCols) {
      const label = d.toLocaleDateString("nl-NL", { month: "long" });
      const last = spans[spans.length - 1];
      if (last && last.label === label) last.days += 1;
      else spans.push({ label, days: 1 });
    }
    return spans;
  }, [dayCols]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
        <p className="text-muted text-sm max-w-md mx-auto">
          Geen kaarten met een datum in dit venster. Zet een deadline of postingdatum op een kaart, dan verschijnt
          hij hier op de tijdlijn.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[12px] text-muted">
          Balk loopt van <span className="text-foreground">aanleveren</span> tot{" "}
          <span className="text-foreground">live</span>. {rows.length} kaarten in beeld, inclusief vorige week.
        </p>
        <div className="flex gap-1.5">
          {[4, 6, 12].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                weeks === w
                  ? "bg-accent text-background font-bold"
                  : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
              }`}
            >
              {w} wk
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <div className="min-w-[900px]">
          {/* Maandbalk */}
          <div
            className="grid border-b border-white/[0.06]"
            style={{ gridTemplateColumns: `220px repeat(${dayCount}, minmax(14px, 1fr))` }}
          >
            <div className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-muted">Kaart</div>
            {monthSpans.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="px-2 py-2 text-[11px] font-mono uppercase tracking-wider text-muted border-l border-white/[0.06] truncate"
                style={{ gridColumn: `span ${m.days}` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Dagbalk */}
          <div
            className="grid border-b border-white/[0.06]"
            style={{ gridTemplateColumns: `220px repeat(${dayCount}, minmax(14px, 1fr))` }}
          >
            <div />
            {dayCols.map((d) => {
              const isToday = startOfDay(d).getTime() === today;
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={d.toISOString()}
                  className={`py-1.5 text-center text-[10px] font-mono ${
                    isToday ? "text-accent font-bold" : weekend ? "text-muted/40" : "text-muted"
                  }`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          {/* Rijen */}
          <div className="divide-y divide-white/[0.04]">
            {rows.map(({ card, start, end, hasRange }) => {
              const c1 = colOf(start);
              const c2 = colOf(end);
              const color = formatColor[card.format] ?? "#9CA3AF";
              const late = end < today && card.stage !== "posted";

              return (
                <div
                  key={card.id}
                  className="grid items-center hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: `220px repeat(${dayCount}, minmax(14px, 1fr))` }}
                >
                  <div className="px-4 py-2 min-w-0">
                    <div className="text-[13px] truncate" title={card.title}>
                      {card.title}
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {card.client} · {stageLabels[card.stage] ?? card.stage}
                    </div>
                  </div>

                  {/* Achtergrondraster (weekend iets donkerder) */}
                  {dayCols.map((d, i) => {
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = startOfDay(d).getTime() === today;
                    return (
                      <div
                        key={i}
                        className={`h-full min-h-[42px] ${weekend ? "bg-white/[0.015]" : ""} ${
                          isToday ? "bg-accent/[0.07]" : ""
                        }`}
                        style={{ gridColumn: i + 2, gridRow: 1 }}
                      />
                    );
                  })}

                  {/* De balk zelf, over de dagkolommen heen */}
                  <div
                    className="relative z-10 h-[22px] flex items-center"
                    style={{ gridColumn: `${c1 + 1} / ${c2 + 2}`, gridRow: 1 }}
                  >
                    <div
                      className="w-full h-[22px] rounded-md flex items-center px-2 gap-1.5 overflow-hidden border"
                      style={{
                        background: `${color}22`,
                        borderColor: late ? "#F8717166" : `${color}55`,
                      }}
                      title={`${card.format} · ${card.due}${late ? " · over tijd" : ""}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      {hasRange && (
                        <span className="text-[10px] font-mono truncate" style={{ color }}>
                          {card.format}
                        </span>
                      )}
                      {late && <span className="text-[10px] text-red-400 ml-auto shrink-0">!</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11.5px] text-muted">
        Een rode rand betekent dat de datum voorbij is terwijl de kaart nog niet gepost is.{" "}
        <Link href="/platform/calendar" className="text-accent hover:text-accent-hover">
          Liever een maandkalender?
        </Link>
      </p>
    </div>
  );
}
