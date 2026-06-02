"use client";

import Link from "next/link";
import {
  clients,
  contentCards,
  leads,
  revenueByMonth,
  stageMeta,
  fmtEur,
  fmtNum,
  type PipelineStage,
} from "./_data";
import { Card, Stat, PageHeader, Avatar, Badge, icons, Eyebrow } from "./_components";

export default function Dashboard() {
  const activeClients = clients.filter((c) => c.status === "actief").length;
  const totalRevenue = clients.reduce((s, c) => s + c.revenueAttributed, 0);
  const totalLeads = clients.reduce((s, c) => s + c.leadsThisMonth, 0);
  const closed = leads.filter((l) => l.stage === "closed");
  const closedValue = closed.reduce((s, l) => s + l.value, 0);

  const maxRev = Math.max(...revenueByMonth.map((d) => d.v));

  const stageCounts = (Object.keys(stageMeta) as PipelineStage[]).map((st) => ({
    st,
    count: contentCards.filter((c) => c.stage === st).length,
  }));
  const totalCards = contentCards.length;

  return (
    <>
      <PageHeader
        eyebrow="Overzicht · juni 2026"
        title="Goedemorgen, Menno"
        subtitle="Hier is wat er speelt over al je klanten — content, leads en omzet op één plek."
      />

      {/* KPI's */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Omzet uit content" value={fmtEur(totalRevenue)} delta="+34% vs. vorige maand" icon={icons.money} />
        <Stat label="Actieve klanten" value={String(activeClients)} delta="+1 deze maand" icon={icons.clients} />
        <Stat label="Leads deze maand" value={String(totalLeads)} delta="+22% vs. vorige maand" icon={icons.leads} />
        <Stat label="Closed via content" value={fmtEur(closedValue)} delta={`${closed.length} deals`} icon={icons.check} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Omzetgrafiek */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Eyebrow>Omzet uit content</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Laatste 12 maanden</h2>
            </div>
            <Badge color="#34D399">{icons.arrowUp} +574% YoY</Badge>
          </div>
          {/* Bar chart (pure CSS) */}
          <div className="flex items-end gap-2 h-44">
            {revenueByMonth.map((d, i) => (
              <div key={d.m} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: "100%" }}>
                  <div
                    className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-accent/30 to-accent transition-all duration-500 group-hover:from-accent/50 group-hover:to-accent-hover"
                    style={{ height: `${(d.v / maxRev) * 100}%` }}
                  />
                  <span className="absolute -top-5 text-[10px] font-mono text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {fmtEur(d.v)}
                  </span>
                </div>
                <span className={`font-mono text-[10px] uppercase ${i === revenueByMonth.length - 1 ? "text-accent" : "text-muted"}`}>
                  {d.m}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pipeline status */}
        <Card className="p-6">
          <Eyebrow>Content pipeline</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-5">Status</h2>
          <div className="space-y-3.5">
            {stageCounts.map(({ st, count }) => (
              <div key={st}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground/80">{stageMeta[st].label}</span>
                  <span className="font-mono text-muted">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${(count / totalCards) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/platform/pipeline"
            className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl border border-white/[0.08] hover:border-accent/30 hover:bg-accent/[0.06] py-2.5 text-sm font-medium transition-all"
          >
            Open pipeline {icons.arrowRight}
          </Link>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Recente leads */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-extrabold text-xl">Recente leads</h2>
            <Link href="/platform/leads" className="text-sm text-accent hover:text-accent-hover flex items-center gap-1">
              Alles bekijken {icons.arrowRight}
            </Link>
          </div>
          <div className="space-y-2">
            {leads.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                <Avatar initials={l.name.replace("@", "").slice(0, 2).toUpperCase()} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-[12px] text-muted truncate">{l.source}</div>
                </div>
                <span className="hidden sm:block text-[12px] text-muted">{l.client}</span>
                <span className="font-mono text-sm">{fmtEur(l.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top klanten */}
        <Card className="p-6">
          <h2 className="font-display font-extrabold text-xl mb-5">Top klanten</h2>
          <div className="space-y-4">
            {[...clients]
              .sort((a, b) => b.revenueAttributed - a.revenueAttributed)
              .slice(0, 4)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <Avatar initials={c.initials} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[12px] text-muted">{fmtNum(c.leadsThisMonth)} leads</div>
                  </div>
                  <span className="font-mono text-sm text-emerald-400">{fmtEur(c.revenueAttributed)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
