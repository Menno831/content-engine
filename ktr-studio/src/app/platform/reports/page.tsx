import { fmtEur, fmtNum } from "../_data";
import { PageHeader, Card, Stat, Eyebrow, Badge, Avatar, icons } from "../_components";
import { getWorkspaceData, getClientReport, type PeriodStats } from "@/lib/data";
import { NotConnected } from "../_states";
import { ClientFilter } from "../ClientFilter";

const MONTHS = ["JANUARI", "FEBRUARI", "MAART", "APRIL", "MEI", "JUNI", "JULI", "AUGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"];

// Delta alleen tonen als de vorige periode echt data had.
function delta(cur: number, prev: number): string | undefined {
  if (prev <= 0) return undefined;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs vorige periode`;
}

function CompareRow({ label, cur, prev }: { label: string; cur: number; prev: number }) {
  const d = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">{fmtNum(cur)}</span>
        {d !== null ? (
          <span className={`font-mono text-[11px] w-16 text-right ${d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
          </span>
        ) : (
          <span className="font-mono text-[11px] w-16 text-right text-muted" title="Geen data in de vorige periode">—</span>
        )}
      </div>
    </div>
  );
}

function PeriodCard({ title, cur, prev }: { title: string; cur: PeriodStats; prev: PeriodStats }) {
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm mb-2">{title}</h3>
      <CompareRow label="Posts live" cur={cur.posts} prev={prev.posts} />
      <CompareRow label="Views" cur={cur.views} prev={prev.views} />
      <CompareRow label="Likes" cur={cur.likes} prev={prev.likes} />
      <CompareRow label="Reacties" cur={cur.comments} prev={prev.comments} />
    </Card>
  );
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const { clients, topContent, demo } = await getWorkspaceData();
  const client = clients.find((c) => c.id === sp.client) ?? clients[0];

  if (!client) {
    return (
      <>
        <PageHeader
          eyebrow="Rapporten"
          title="Automatische rapportage"
          subtitle="Koppel een klant en sync content om hier een rapport te genereren."
        />
        <NotConnected provider="Rapporten">
          Nog geen klanten of content — voeg een klant toe en draai een Instagram-sync.
        </NotConnected>
      </>
    );
  }

  const report = demo ? null : await getClientReport(client.id);
  const now = new Date();
  const hasAnyData = report
    ? report.month.posts + report.prevMonth.posts + report.week.posts + report.prevWeek.posts > 0
    : false;

  return (
    <>
      <PageHeader
        eyebrow="Rapporten"
        title="Automatische rapportage"
        subtitle="Per klant: wat deed de content deze week en deze maand t.o.v. de vorige periode — Instagram én YouTube."
      />

      <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Periode-vergelijking links */}
        <div className="space-y-4">
          <Eyebrow>Vergelijking · {client.name}</Eyebrow>
          {report && hasAnyData ? (
            <>
              <PeriodCard title="Deze week vs vorige week" cur={report.week} prev={report.prevWeek} />
              <PeriodCard title="Afgelopen 30 dagen vs daarvoor" cur={report.month} prev={report.prevMonth} />
              <Card className="p-5">
                <h3 className="font-display font-bold text-sm mb-3">Bron (30 dagen)</h3>
                <div className="flex items-center gap-3">
                  <Badge color="#F97316">Instagram · {report.bySource.instagram}</Badge>
                  <Badge color="#F87171">YouTube · {report.bySource.youtube}</Badge>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-5 border-dashed">
              <p className="text-[13px] text-muted leading-relaxed">
                {demo
                  ? "Demo-modus — koppel echte data voor periode-vergelijkingen."
                  : "Nog geen gepubliceerde content met metrics voor deze klant. Draai een sync (Instagram-handle of YouTube-kanaal op het klantprofiel) en dit vult zich automatisch."}
              </p>
            </Card>
          )}
        </div>

        {/* Rapport-preview */}
        <Card className="lg:col-span-2 p-0 overflow-hidden h-fit">
          <div className="bg-gradient-to-br from-accent/[0.12] to-transparent border-b border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-background">{icons.spark}</span>
                <span className="font-display font-extrabold">KTR Studio</span>
              </div>
              <span className="font-mono text-[11px] text-muted">{MONTHS[now.getMonth()]} {now.getFullYear()} · MAANDRAPPORT</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar initials={client.initials} size={44} />
              <div>
                <h2 className="font-display font-extrabold text-2xl">{client.name}</h2>
                <p className="text-muted text-sm">{client.handle || "—"} · contentprestaties</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Kerncijfers — echte data of niets */}
            <div className="grid grid-cols-3 gap-4">
              <Stat
                label="Views (30d)"
                value={report ? fmtNum(report.month.views) : fmtNum(190200)}
                delta={report ? delta(report.month.views, report.prevMonth.views) : "+38%"}
              />
              <Stat label="Leads (maand)" value={String(client.leadsThisMonth)} />
              <Stat label="Omzet uit content" value={fmtEur(client.revenueAttributed)} />
            </div>

            {/* Top content */}
            <div>
              <h3 className="font-display font-bold text-sm mb-3">Top content</h3>
              <div className="space-y-2">
                {topContent.filter((c) => c.client === client.name).length === 0 ? (
                  <p className="text-[13px] text-muted">Nog geen gesyncte content voor deze klant.</p>
                ) : (
                  topContent
                    .filter((c) => c.client === client.name)
                    .map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.01] px-4 py-3">
                        <span className="text-sm truncate">{c.title}</span>
                        <div className="flex items-center gap-4 shrink-0 text-[12px]">
                          <span className="flex items-center gap-1 text-muted">
                            <span className="w-3.5 h-3.5">{icons.eye}</span> {fmtNum(c.views)}
                          </span>
                          <span className="text-emerald-400 font-mono">{fmtEur(c.revenue)}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
