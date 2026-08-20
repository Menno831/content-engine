import Link from "next/link";
import { getClient } from "@/lib/data";
import { getClientStats } from "@/lib/workspace";
import { Card, Eyebrow } from "../../../_components";
import { fmtNum } from "../../../_data";

const PERIODS = [
  { days: 7, label: "7 dagen" },
  { days: 30, label: "30 dagen" },
  { days: 90, label: "90 dagen" },
];

const platformMeta: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#A78BFA" },
  youtube: { label: "YouTube", color: "#F87171" },
  tiktok: { label: "TikTok", color: "#34D399" },
};

// Stats-tab: bereik, engagement en volgersgroei per platform, plus
// waar het naartoe gaat als dit tempo doorzet.
export default async function ClientStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dagen?: string; platform?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const days = PERIODS.find((p) => String(p.days) === sp.dagen)?.days ?? 7;
  const [c, stats] = await Promise.all([getClient(id), getClientStats(id, days)]);
  if (!c) return null;

  const base = `/platform/clients/${id}/stats`;
  const platformFilter = sp.platform ?? "";
  const shown = stats?.platforms.filter((p) => !platformFilter || p.platform === platformFilter) ?? [];
  const view = platformFilter && shown.length === 1 ? shown[0] : stats?.total;
  const recent = (stats?.recent ?? []).filter((r) => !platformFilter || r.platform === platformFilter);

  if (!stats || (stats.total.posts === 0 && !stats.total.followers)) {
    return (
      <Card className="p-10 text-center border-dashed">
        <p className="text-muted text-sm max-w-md mx-auto">
          Nog geen cijfers voor {c.name}. Zet de Instagram-handle of het YouTube-kanaal op het Profiel-tabblad en klik
          bovenin op ↻ Sync — daarna verschijnen bereik, likes en volgersgroei hier vanzelf.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Periode + platform */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          <Chip href={platformFilter ? `${base}?dagen=${days}` : base} active={!platformFilter} label="Alle platforms" />
          {stats.platforms.map((p) => (
            <Chip
              key={p.platform}
              href={`${base}?dagen=${days}&platform=${p.platform}`}
              active={platformFilter === p.platform}
              label={platformMeta[p.platform]?.label ?? p.platform}
              color={platformMeta[p.platform]?.color}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Chip
              key={p.days}
              href={`${base}?dagen=${p.days}${platformFilter ? `&platform=${platformFilter}` : ""}`}
              active={days === p.days}
              label={p.label}
            />
          ))}
        </div>
      </div>

      {stats.lastSync && (
        <p className="text-[11.5px] text-muted mb-4">
          Laatste sync: {new Date(stats.lastSync).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {/* Kerncijfers */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Tile label="Volgers" value={view?.followers != null ? fmtNum(view.followers) : "—"} delta={view?.followerDelta} />
        <Tile label={`Bereik (${days}d)`} value={fmtNum(view?.reach ?? 0)} />
        <Tile label={`Likes (${days}d)`} value={fmtNum(view?.likes ?? 0)} />
        <Tile label={`Reacties (${days}d)`} value={fmtNum(view?.comments ?? 0)} />
        <Tile label={`Posts (${days}d)`} value={String(view?.posts ?? 0)} />
        <Tile label="Engagement" value={`${(view?.engagement ?? 0).toFixed(2)}%`} />
      </div>

      {/* Groei & projectie */}
      {stats.total.followers != null && stats.total.followers > 0 && (
        <Card className="p-6 mb-6">
          <Eyebrow>Als dit tempo doorzet</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-4">Vooruitblik</h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <Projection label="Over 30 dagen" value={stats.projection.days30} delta={stats.projection.days30 - (stats.total.followers ?? 0)} />
            <Projection label="Over 90 dagen" value={stats.projection.days90} delta={stats.projection.days90 - (stats.total.followers ?? 0)} />
            <Projection label="Over een jaar" value={stats.projection.year} delta={stats.projection.year - (stats.total.followers ?? 0)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] px-4 py-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Groeitempo</div>
              <div className="font-display font-extrabold text-xl">
                {stats.growthPerDay >= 0 ? "+" : ""}
                {stats.growthPerDay}
                <span className="text-[13px] font-normal text-muted">/dag</span>
              </div>
              <div className="text-[11.5px] text-muted mt-0.5">
                {stats.growthPerDay >= 0 ? "+" : ""}
                {Math.round(stats.growthPerDay * 30)} per maand
              </div>
            </div>
            {stats.milestone && (
              <div className="rounded-xl border border-white/[0.06] px-4 py-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Volgende mijlpaal</div>
                <div className="font-display font-extrabold text-xl">{fmtNum(stats.milestone.target)}</div>
                <div className="text-[11.5px] text-muted mt-0.5">
                  {stats.milestone.daysAway != null ? `~${stats.milestone.daysAway} dagen` : "tempo onbekend"}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${stats.milestone.pct}%` }} />
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {fmtNum(stats.total.followers ?? 0)} van {fmtNum(stats.milestone.target)} · {stats.milestone.pct}%
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Recente posts */}
      <Card className="p-6">
        <Eyebrow>Laatst getrackt</Eyebrow>
        <h2 className="font-display font-extrabold text-xl mb-4">Recente posts</h2>
        {recent.length === 0 ? (
          <p className="text-[13px] text-muted">Nog geen gepubliceerde posts gesynct.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  <th className="text-left font-normal pb-2">Datum</th>
                  <th className="text-left font-normal pb-2">Post</th>
                  <th className="text-right font-normal pb-2">Bereik</th>
                  <th className="text-right font-normal pb-2">Likes</th>
                  <th className="text-right font-normal pb-2">Reacties</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                        style={{ background: platformMeta[p.platform]?.color ?? "#888" }}
                      />
                      {p.date ? new Date(p.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="py-2 pr-3 max-w-[420px]">
                      {p.permalink ? (
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors line-clamp-1" title={p.title}>
                          {p.title || "(zonder bijschrift)"}
                        </a>
                      ) : (
                        <span className="line-clamp-1" title={p.title}>{p.title || "(zonder bijschrift)"}</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono">{fmtNum(p.reach)}</td>
                    <td className="py-2 text-right font-mono text-muted">{fmtNum(p.likes)}</td>
                    <td className="py-2 text-right font-mono text-muted">{fmtNum(p.comments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Chip({ href, active, label, color }: { href: string; active: boolean; label: string; color?: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
        active ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {color && !active && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: color }} />}
      {label}
    </Link>
  );
}

function Tile({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
        {delta != null && delta !== 0 && (
          <span className={`text-[11px] font-mono ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta > 0 ? "+" : ""}
            {fmtNum(delta)}
          </span>
        )}
      </div>
      <div className="font-display font-extrabold text-2xl">{value}</div>
    </Card>
  );
}

function Projection({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted">{label}</span>
        <span className="text-[11px] font-mono text-emerald-400">
          {delta >= 0 ? "+" : ""}
          {fmtNum(delta)}
        </span>
      </div>
      <div className="font-display font-extrabold text-xl">{fmtNum(value)}</div>
    </div>
  );
}
