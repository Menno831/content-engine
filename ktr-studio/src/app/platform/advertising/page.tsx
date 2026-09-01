import Link from "next/link";
import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader, Card, Eyebrow } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getAdData, totalsOf, groupBy, byDay, colorFor, type AdEntry, type AdTotals, type AdGroup } from "@/lib/ads";
import { AdCharts, type DayStack } from "./AdCharts";
import { AdImport } from "./AdImport";
import { AdQuickAdd } from "./AdQuickAdd";
import { AdInsightPanel } from "./AdInsightPanel";
import { DeleteEntry } from "./DeleteEntry";

const PERIODS = [7, 30, 90];

const eur = (n: number) => `€${n.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;
const eur2 = (n: number) => `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString("nl-NL");

// Streepje in plaats van een 0 die niets betekent: geen klikken is geen CPC.
const orDash = (v: number | null, fmt: (n: number) => string) => (v === null ? "—" : fmt(v));

export default async function AdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; client?: string }>;
}) {
  await redirectEditorToBoard();
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.d)) ? Number(sp.d) : 30;
  const clientId = sp.client || null;

  const [{ clients, demo }, data] = await Promise.all([getWorkspaceData(), getAdData(days, clientId)]);

  const now = totalsOf(data.entries);
  const before = totalsOf(data.previous);
  const platforms = groupBy(data.entries, (e) => e.platform);
  const campaigns = groupBy(data.entries, (e) => e.campaign);
  const creatives = groupBy(data.entries, (e) => e.creative);
  const adsets = groupBy(data.entries, (e) => e.adset);

  // Dagreeks met de platform-opsplitsing erin, voor de gestapelde grafiek.
  const dayRows = byDay(data.entries, data.from, data.to);
  const perDayPlatform = new Map<string, Map<string, number>>();
  for (const e of data.entries) {
    const inner = perDayPlatform.get(e.date) ?? new Map<string, number>();
    inner.set(e.platform, (inner.get(e.platform) ?? 0) + e.spend);
    perDayPlatform.set(e.date, inner);
  }
  const stacks: DayStack[] = dayRows.map((d) => ({
    ...d,
    perPlatform: [...(perDayPlatform.get(d.date) ?? new Map()).entries()]
      .map(([platform, spend]) => ({ platform, spend: spend as number }))
      .sort((a, b) => b.spend - a.spend),
  }));

  const platformNames = platforms.map((p) => p.key);
  const recent = [...data.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const d = over.d ?? String(days);
    if (d !== "30") p.set("d", d);
    const c = "client" in over ? over.client : (clientId ?? undefined);
    if (c) p.set("client", c);
    return p.size ? `?${p.toString()}` : "";
  };

  return (
    <>
      <PageHeader
        eyebrow="Groei"
        title="Advertenties"
        subtitle="Wat je uitgeeft, wat het oplevert en welke advertentie het verschil maakt — met een analyse die zegt waar je budget heen moet."
        action={
          demo ? undefined : (
            <div className="flex items-center gap-2">
              <AdImport clients={clientOptions} />
              <AdQuickAdd clients={clientOptions} />
            </div>
          )
        }
      />

      {demo ? (
        <p className="text-sm text-muted">Demo-modus — advertenties werken in de echte omgeving.</p>
      ) : data.migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 039 in Supabase (tabellen <code>ad_entries</code> en <code>ad_insights</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <>
          {/* Periode + klantfilter */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/platform/advertising${qs({ d: String(p) })}`}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-all ${
                  p === days ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
                }`}
              >
                {p} dagen
              </Link>
            ))}
            <span className="w-px h-5 bg-white/[0.08] mx-1" />
            <Link
              href={`/platform/advertising${qs({ client: undefined })}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-all ${
                !clientId ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
              }`}
            >
              Alles
            </Link>
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/platform/advertising${qs({ client: c.id })}`}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-all ${
                  clientId === c.id ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>

          {/* Kopcijfers met verschil t.o.v. de vorige even lange periode */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <Kpi label="Uitgegeven" value={eur(now.spend)} delta={delta(now.spend, before.spend, true)} />
            <Kpi label="Resultaten" value={num(now.results)} delta={delta(now.results, before.results, false)} />
            <Kpi label="Per resultaat" value={orDash(now.cpl, eur2)} delta={delta(now.cpl, before.cpl, true)} />
            <Kpi label="CTR" value={orDash(now.ctr, (v) => `${v.toFixed(1)}%`)} delta={delta(now.ctr, before.ctr, false)} />
            <Kpi label="CPM" value={orDash(now.cpm, eur2)} delta={delta(now.cpm, before.cpm, true)} />
            <Kpi
              label="ROAS"
              value={orDash(now.roas, (v) => `${v.toFixed(2)}×`)}
              delta={delta(now.roas, before.roas, false)}
              hint={now.revenue === 0 ? "geen omzet ingevuld" : undefined}
            />
          </div>

          {data.entries.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-sm text-muted mb-4">
                Nog geen advertentiedata in deze periode. Importeer een export uit Ads Manager of voeg handmatig een regel toe.
              </p>
              <div className="flex items-center justify-center gap-2">
                <AdImport clients={clientOptions} />
                <AdQuickAdd clients={clientOptions} />
              </div>
            </Card>
          ) : (
            <>
              <Card className="p-6 mb-6">
                <AdCharts days={stacks} platforms={platformNames} />
              </Card>

              <div className="mb-6">
                <AdInsightPanel insight={data.insight} days={days} clientId={clientId} hasData={data.entries.length > 0} />
              </div>

              <div className="grid xl:grid-cols-2 gap-6">
                <Table title="Per campagne" rows={campaigns} total={now.spend} />
                <Table title="Per advertentie" rows={creatives} total={now.spend} />
              </div>

              <div className="grid xl:grid-cols-2 gap-6 mt-6">
                <Table title="Per doelgroep" rows={adsets} total={now.spend} />
                <Table title="Per platform" rows={platforms} total={now.spend} colored />
              </div>

              {/* Ruwe regels, zodat je een importfout meteen kunt terugdraaien */}
              <Card className="p-6 mt-6">
                <Eyebrow>Losse regels</Eyebrow>
                <h2 className="font-display font-extrabold text-xl mb-4">Laatste invoer</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] tabular-nums">
                    <thead>
                      <tr className="text-muted text-left">
                        <Th>Datum</Th>
                        <Th>Advertentie</Th>
                        <Th>Platform</Th>
                        <Th right>Uitgaven</Th>
                        <Th right>Resultaten</Th>
                        <Th right>Bron</Th>
                        <Th right> </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((e: AdEntry) => (
                        <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.015]">
                          <td className="py-2 pr-3 whitespace-nowrap text-muted">{e.date}</td>
                          <td className="py-2 pr-3 max-w-[260px] truncate" title={[e.campaign, e.adset, e.creative].filter(Boolean).join(" · ")}>
                            {e.creative ?? e.campaign ?? "—"}
                          </td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-sm" style={{ background: colorFor(e.platform) }} />
                              {e.platform}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">{eur2(e.spend)}</td>
                          <td className="py-2 pr-3 text-right">{e.results}</td>
                          <td className="py-2 pr-3 text-right text-muted text-[12px]">{e.source}</td>
                          <td className="py-2 text-right"><DeleteEntry id={e.id} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.entries.length > recent.length && (
                  <p className="text-[12px] text-muted mt-3">
                    {data.entries.length - recent.length} oudere regels in deze periode niet getoond.
                  </p>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}

// ── Kopcijfer ───────────────────────────────────────────────────
function delta(now: number | null, before: number | null, lowerIsBetter: boolean) {
  if (now === null || before === null || before === 0) return null;
  const pct = ((now - before) / before) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) return { text: "gelijk", good: null as boolean | null };
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  return { text: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`, good };
}

function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta: { text: string; good: boolean | null } | null;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-card p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="font-display font-extrabold text-2xl tabular-nums leading-none">{value}</div>
      <div className="mt-1.5 text-[11.5px]">
        {hint ? (
          <span className="text-muted">{hint}</span>
        ) : delta ? (
          <span className={delta.good === null ? "text-muted" : delta.good ? "text-emerald-400" : "text-red-400"}>
            {delta.text} <span className="text-muted">vs vorige periode</span>
          </span>
        ) : (
          <span className="text-muted">geen vergelijking</span>
        )}
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`font-mono font-normal uppercase text-[10px] tracking-wider pb-2 ${right ? "text-right pl-3" : "pr-3"}`}>
      {children}
    </th>
  );
}

// ── Groepstabel ─────────────────────────────────────────────────
function Table({ title, rows, total, colored }: { title: string; rows: AdGroup[]; total: number; colored?: boolean }) {
  const shown = rows.slice(0, 12);
  return (
    <Card className="p-6">
      <h2 className="font-display font-extrabold text-xl mb-4">{title}</h2>
      {shown.length === 0 ? (
        <p className="text-[13px] text-muted">Niets ingevuld op dit niveau.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-muted text-left">
                <Th>Naam</Th>
                <Th right>Uitgaven</Th>
                <Th right>Res.</Th>
                <Th right>Per res.</Th>
                <Th right>CTR</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r: AdGroup & AdTotals) => (
                <tr key={r.key} className="border-t border-white/[0.05] hover:bg-white/[0.015]">
                  <td className="py-2 pr-3 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      {colored && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: colorFor(r.key) }} />}
                      <span className="truncate" title={r.key}>{r.key}</span>
                    </div>
                    {/* Aandeel in de uitgaven — meteen zien waar het geld heen gaat */}
                    <div className="mt-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${total > 0 ? (r.spend / total) * 100 : 0}%`, background: colored ? colorFor(r.key) : "#DE5F0A" }}
                      />
                    </div>
                  </td>
                  <td className="py-2 pl-3 text-right">{eur2(r.spend)}</td>
                  <td className="py-2 pl-3 text-right">{r.results}</td>
                  <td className="py-2 pl-3 text-right">{orDash(r.cpl, eur2)}</td>
                  <td className="py-2 pl-3 text-right text-muted">{orDash(r.ctr, (v) => `${v.toFixed(1)}%`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > shown.length && (
            <p className="text-[12px] text-muted mt-3">+{rows.length - shown.length} meer</p>
          )}
        </div>
      )}
    </Card>
  );
}
