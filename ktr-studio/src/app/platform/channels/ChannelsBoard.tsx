"use client";

// ════════════════════════════════════════════════════════════════
// Eigen kanalen: website, Instagram, LinkedIn en YouTube op één
// scherm. Per kanaal het laatste cijfer, het verschil met de vorige
// meting en een sparkline over de laatste snapshots. Invoer is één
// regel per kanaal — datum staat standaard op vandaag.
// ════════════════════════════════════════════════════════════════

import { useMemo, useState, useTransition } from "react";
import { Card, Badge } from "../_components";
import { saveChannelStatAction, deleteChannelStatAction } from "./actions";

export interface StatRow {
  id: string;
  channel: string;
  date: string;
  followers: number | null;
  visitors: number | null;
  views: number | null;
  impressions: number | null;
}

interface FieldDef {
  key: "followers" | "visitors" | "views" | "impressions";
  label: string;
}

const CHANNELS: {
  id: string;
  label: string;
  color: string;
  /** Hoofdcijfer voor de grote teller + sparkline. */
  primary: FieldDef;
  fields: FieldDef[];
  hint: string;
}[] = [
  {
    id: "website",
    label: "Website",
    color: "#60A5FA",
    primary: { key: "visitors", label: "Bezoekers" },
    fields: [
      { key: "visitors", label: "Bezoekers" },
      { key: "views", label: "Paginaweergaven" },
    ],
    hint: "Uit Clarity of GA4 — wekelijks overnemen is genoeg.",
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "#F97316",
    primary: { key: "followers", label: "Volgers" },
    fields: [
      { key: "followers", label: "Volgers" },
      { key: "views", label: "Reels-views" },
      { key: "impressions", label: "Bereik" },
    ],
    hint: "Volgers komen ook binnen via de sync zodra je eigen profiel als klant gekoppeld is.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#34D399",
    primary: { key: "followers", label: "Volgers" },
    fields: [
      { key: "followers", label: "Volgers" },
      { key: "impressions", label: "Impressies" },
    ],
    hint: "Cijfers uit je LinkedIn-dashboard (Analytics → Volgers/Impressies).",
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "#F87171",
    primary: { key: "followers", label: "Abonnees" },
    fields: [
      { key: "followers", label: "Abonnees" },
      { key: "views", label: "Views" },
    ],
    hint: "Gaat automatisch zodra de YouTube-key er is — tot die tijd handmatig uit YouTube Studio.",
  },
];

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString("nl-NL");

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const W = 120;
  const H = 32;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((p - min) / span) * H).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

export function ChannelsBoard({ initial }: { initial: StatRow[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState("");
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  // Invoerstaat per kanaal: datum + losse velden.
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(CHANNELS.map((c) => [c.id, { date: today }]))
  );

  const byChannel = useMemo(() => {
    const map = new Map<string, StatRow[]>();
    for (const r of rows) {
      const arr = map.get(r.channel) ?? [];
      arr.push(r);
      map.set(r.channel, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [rows]);

  function save(channelId: string) {
    const c = CHANNELS.find((x) => x.id === channelId)!;
    const d = draft[channelId];
    const payload: Record<string, number | null> = {};
    let any = false;
    for (const f of c.fields) {
      const v = d[f.key]?.trim();
      payload[f.key] = v ? Number(v.replace(/\./g, "").replace(",", ".")) : null;
      if (v) any = true;
    }
    if (!any) {
      setError(`Vul minstens één cijfer in bij ${c.label}.`);
      return;
    }
    start(async () => {
      const r = await saveChannelStatAction({ channel: channelId, date: d.date || today, ...payload });
      if (r.error) setError(r.error);
      else {
        setError("");
        setSavedFor(channelId);
        setTimeout(() => setSavedFor(null), 1500);
        const date = d.date || today;
        setRows((cur) => {
          const without = cur.filter((x) => !(x.channel === channelId && x.date === date));
          return [
            ...without,
            {
              id: `tmp-${channelId}-${date}`,
              channel: channelId,
              date,
              followers: payload.followers ?? null,
              visitors: payload.visitors ?? null,
              views: payload.views ?? null,
              impressions: payload.impressions ?? null,
            },
          ];
        });
        setDraft((cur) => ({ ...cur, [channelId]: { date } }));
      }
    });
  }

  function removeRow(id: string) {
    setRows((cur) => cur.filter((r) => r.id !== id));
    start(async () => {
      await deleteChannelStatAction(id);
    });
  }

  const field =
    "w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-[13px] outline-none focus:border-accent/40";

  return (
    <>
      {error && <p className="mb-4 text-[13px] text-red-400">{error}</p>}

      <div className="grid md:grid-cols-2 gap-5">
        {CHANNELS.map((c) => {
          const series = byChannel.get(c.id) ?? [];
          const latest = series[series.length - 1];
          const prev = series[series.length - 2];
          const primaryNow = latest?.[c.primary.key] ?? null;
          const primaryPrev = prev?.[c.primary.key] ?? null;
          const delta = primaryNow != null && primaryPrev != null ? primaryNow - primaryPrev : null;
          const sparkPoints = series.map((s) => s[c.primary.key]).filter((n): n is number => n != null).slice(-12);

          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="font-display font-extrabold text-lg">{c.label}</span>
                    {savedFor === c.id && <Badge color="#34D399">opgeslagen ✓</Badge>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-display font-extrabold text-3xl">{fmt(primaryNow)}</span>
                    <span className="text-[12px] text-muted">{c.primary.label.toLowerCase()}</span>
                    {delta != null && delta !== 0 && (
                      <span className={`text-[12px] font-mono ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta.toLocaleString("nl-NL")}
                      </span>
                    )}
                  </div>
                  {latest && (
                    <div className="text-[11px] text-muted mt-1">
                      laatste meting {new Date(latest.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      {latest.views != null && c.primary.key !== "views" && ` · ${fmt(latest.views)} views`}
                      {latest.impressions != null && ` · ${fmt(latest.impressions)} impressies`}
                      {latest.visitors != null && c.primary.key !== "visitors" && ` · ${fmt(latest.visitors)} bezoekers`}
                    </div>
                  )}
                </div>
                <Sparkline points={sparkPoints} color={c.color} />
              </div>

              {/* Invoerregel */}
              <div className="flex flex-wrap gap-2 items-end">
                <label className="block w-[130px]">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Datum</span>
                  <input
                    type="date"
                    value={draft[c.id]?.date ?? today}
                    onChange={(e) => setDraft((cur) => ({ ...cur, [c.id]: { ...cur[c.id], date: e.target.value } }))}
                    className={field}
                  />
                </label>
                {c.fields.map((f) => (
                  <label key={f.key} className="block flex-1 min-w-[90px]">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{f.label}</span>
                    <input
                      inputMode="numeric"
                      placeholder="—"
                      value={draft[c.id]?.[f.key] ?? ""}
                      onChange={(e) => setDraft((cur) => ({ ...cur, [c.id]: { ...cur[c.id], [f.key]: e.target.value } }))}
                      onKeyDown={(e) => e.key === "Enter" && save(c.id)}
                      className={field}
                    />
                  </label>
                ))}
                <button
                  onClick={() => save(c.id)}
                  disabled={pending}
                  className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-[13px] px-4 py-2 transition-colors"
                >
                  Opslaan
                </button>
              </div>
              <p className="mt-2.5 text-[11.5px] text-muted">{c.hint}</p>

              {/* Historie, ingeklapt houden: alleen laatste 5 */}
              {series.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-0.5">
                  {[...series].reverse().slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-[12px] text-muted group px-1 py-0.5 rounded hover:bg-white/[0.02]">
                      <span>{new Date(s.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                      <span className="flex items-center gap-3 font-mono">
                        {c.fields.map((f) => (
                          <span key={f.key}>{fmt(s[f.key])}</span>
                        ))}
                        <button
                          onClick={() => removeRow(s.id)}
                          disabled={s.id.startsWith("tmp-")}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all disabled:opacity-0"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
