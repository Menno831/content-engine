"use client";

// ════════════════════════════════════════════════════════════════
// Twee grafieken onder elkaar met dezelfde dag-as: uitgaven (gestapeld
// per platform) en resultaten. Bewust géén twee assen in één grafiek —
// dat leest altijd verkeerd. Hover geeft de exacte dagcijfers.
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import { colorFor, type AdDay } from "@/lib/ads-shared";

export interface DayStack extends AdDay {
  perPlatform: { platform: string; spend: number }[];
}

const eur = (n: number) => `€${n.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function AdCharts({ days, platforms }: { days: DayStack[]; platforms: string[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const maxSpend = Math.max(1, ...days.map((d) => d.spend));
  const maxResults = Math.max(1, ...days.map((d) => d.results));
  const active = hover !== null ? days[hover] : null;

  // Bij lange periodes niet elke dag labelen — dat wordt een muur tekst.
  const step = days.length > 45 ? 7 : days.length > 20 ? 3 : days.length > 10 ? 2 : 1;

  return (
    <div className="relative">
      {/* Legenda: identiteit nooit alleen via kleur */}
      {platforms.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {platforms.map((p) => (
            <span key={p} className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(p) }} />
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Zwevend kaartje met de dagcijfers */}
      {active && (
        <div className="pointer-events-none absolute -top-1 right-0 z-10 rounded-xl border border-white/[0.1] bg-[#0C0C0C] px-3 py-2 text-[12px] shadow-xl">
          <div className="font-medium mb-1">{dayLabel(active.date)}</div>
          <div className="text-muted">
            {eur(active.spend)} uitgegeven · {active.results} resultaten
            {active.cpl !== null && <> · {eur(active.cpl)} per resultaat</>}
          </div>
          {active.perPlatform.length > 1 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {active.perPlatform.map((p) => (
                <span key={p.platform} className="flex items-center gap-1.5 text-muted">
                  <span className="w-2 h-2 rounded-sm" style={{ background: colorFor(p.platform) }} />
                  {p.platform} {eur(p.spend)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Uitgaven per dag, gestapeld per platform */}
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">Uitgaven per dag</div>
      <div className="flex items-end gap-[2px] h-[132px]" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <button
            key={d.date}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${dayLabel(d.date)}: ${eur(d.spend)} uitgegeven, ${d.results} resultaten`}
            className={`flex-1 h-full flex flex-col justify-end gap-[2px] rounded-t transition-opacity ${
              hover !== null && hover !== i ? "opacity-45" : ""
            }`}
          >
            {d.spend === 0 ? (
              <span className="block h-[2px] rounded-sm bg-white/[0.07]" />
            ) : (
              d.perPlatform.map((p, j) => (
                <span
                  key={p.platform}
                  className="block w-full"
                  style={{
                    height: `${Math.max(2, (p.spend / maxSpend) * 118)}px`,
                    background: colorFor(p.platform),
                    borderRadius: j === 0 ? "4px 4px 0 0" : "0",
                  }}
                />
              ))
            )}
          </button>
        ))}
      </div>

      {/* Resultaten per dag — eigen schaal, eigen grafiek */}
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted mt-5 mb-1.5">Resultaten per dag</div>
      <div className="flex items-end gap-[2px] h-[76px]" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <button
            key={d.date}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${dayLabel(d.date)}: ${d.results} resultaten`}
            className={`flex-1 h-full flex flex-col justify-end transition-opacity ${
              hover !== null && hover !== i ? "opacity-45" : ""
            }`}
          >
            <span
              className="block w-full rounded-t"
              style={{
                height: d.results === 0 ? "2px" : `${Math.max(3, (d.results / maxResults) * 68)}px`,
                background: d.results === 0 ? "rgba(255,255,255,.07)" : "#F5F0EB",
                borderRadius: "4px 4px 0 0",
              }}
            />
          </button>
        ))}
      </div>

      {/* Dag-as, gedeeld door beide grafieken */}
      <div className="flex gap-[2px] mt-2">
        {days.map((d, i) => (
          <span key={d.date} className="flex-1 text-center text-[9.5px] text-muted/70 tabular-nums truncate">
            {i % step === 0 ? new Date(`${d.date}T00:00:00`).getDate() : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
