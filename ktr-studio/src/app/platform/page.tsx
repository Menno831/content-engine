import Link from "next/link";
import { stageMeta, fmtEur, fmtNum, type PipelineStage, type ContentCard } from "./_data";
import { Card, Stat, PageHeader, Avatar, Badge, icons, Eyebrow } from "./_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";

export default async function Dashboard() {
  const { clients, content: contentCards, leads, revenueByMonth, demo } = await getWorkspaceData();
  const ctx = await getSessionContext();

  // Klant-login: eigen overzicht i.p.v. agency-cijfers.
  if (ctx.profile?.role === "client") {
    return <ClientOverview content={contentCards} clientName={ctx.clientName ?? "je merk"} leadsCount={leads.length} />;
  }

  const activeClients = clients.filter((c) => c.status === "actief").length;
  const totalRevenue = clients.reduce((s, c) => s + c.revenueAttributed, 0);
  const totalLeads = clients.reduce((s, c) => s + c.leadsThisMonth, 0);
  const closed = leads.filter((l) => l.stage === "closed");
  const closedValue = closed.reduce((s, l) => s + l.value, 0);

  const maxRev = Math.max(1, ...revenueByMonth.map((d) => d.v));

  const stageCounts = (Object.keys(stageMeta) as PipelineStage[]).map((st) => ({
    st,
    count: contentCards.filter((c) => c.stage === st).length,
  }));
  const totalCards = Math.max(1, contentCards.length);

  // Eerste keer (echte data, nog geen klanten): toon een onboarding i.p.v. nullen.
  if (!demo && clients.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Aan de slag"
          title="Welkom bij KTR Studio"
          subtitle="Je workspace staat klaar. Drie stappen en je dashboard vult zich met echte data."
        />
        <div className="grid md:grid-cols-3 gap-4">
          <OnboardingStep n={1} title="Voeg je eerste klant toe" body="Maak een klant aan met z'n Instagram-handle." cta="Naar Klanten" />
          <OnboardingStep n={2} title="Koppel een bron" body="Verbind Instagram zodat we content en cijfers kunnen ophalen." cta="Bron koppelen" />
          <OnboardingStep n={3} title="Sync de data" body="Klik 'Sync' op de klant — content en metrics stromen binnen." cta="Open Klanten" />
        </div>
        <p className="mt-6 text-sm text-muted">
          Zodra er data is, zie je hier automatisch je omzet, leads en pipeline-status.
        </p>
      </>
    );
  }

  const monthlyTarget = demo ? 20000 : Number(ctx.agency?.monthly_target ?? 0);
  const monthClosed = revenueByMonth[revenueByMonth.length - 1]?.v ?? 0;
  const targetPct = monthlyTarget > 0 ? Math.min(100, Math.round((monthClosed / monthlyTarget) * 100)) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overzicht"
        title="Dashboard"
        subtitle="Wat er speelt over al je klanten — content, leads en omzet op één plek."
      />

      {/* KPI's */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Omzet uit content" value={fmtEur(totalRevenue)} delta={demo ? "+34% vs. vorige maand" : undefined} icon={icons.money} />
        <Stat label="Actieve klanten" value={String(activeClients)} delta={demo ? "+1 deze maand" : undefined} icon={icons.clients} />
        <Stat label="Leads deze maand" value={String(totalLeads)} delta={demo ? "+22% vs. vorige maand" : undefined} icon={icons.leads} />
        <Stat label="Closed via content" value={fmtEur(closedValue)} delta={`${closed.length} deals`} icon={icons.check} />
      </div>

      {monthlyTarget > 0 && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent">{icons.target}</span>
              <div>
                <div className="font-display font-bold">Maanddoel</div>
                <div className="text-[12px] text-muted">{fmtEur(monthClosed)} van {fmtEur(monthlyTarget)}</div>
              </div>
            </div>
            <span className="font-display font-extrabold text-2xl">{targetPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all" style={{ width: `${targetPct}%` }} />
          </div>
        </Card>
      )}

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

function OnboardingStep({
  n,
  title,
  body,
  cta,
}: {
  n: number;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Card className="p-6">
      <span className="inline-grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent font-display font-extrabold mb-4">
        {n}
      </span>
      <h3 className="font-display font-bold text-base mb-1">{title}</h3>
      <p className="text-muted text-sm leading-relaxed mb-4">{body}</p>
      <Link
        href="/platform/clients"
        className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-hover transition-colors"
      >
        {cta} {icons.arrowRight}
      </Link>
    </Card>
  );
}

function ClientOverview({
  content,
  clientName,
  leadsCount,
}: {
  content: ContentCard[];
  clientName: string;
  leadsCount: number;
}) {
  const posted = content.filter((c) => c.stage === "posted");
  const inProduction = content.filter((c) => c.stage !== "posted");
  const waitingApproval = content.filter((c) => c.stage === "client_approval");
  const totalReach = posted.reduce((s, c) => s + (c.reach ?? c.views ?? 0), 0);

  const stageCounts = (Object.keys(stageMeta) as PipelineStage[]).map((st) => ({
    st,
    count: content.filter((c) => c.stage === st).length,
  }));
  const totalCards = Math.max(1, content.length);

  return (
    <>
      <PageHeader eyebrow="Overzicht" title={`Hoi, ${clientName}`} subtitle="Je content, prestaties en wat er van je nodig is — in één oogopslag." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Live geplaatst" value={String(posted.length)} icon={icons.pipeline} />
        <Stat label="Totaal bereik" value={fmtNum(totalReach)} icon={icons.eye} />
        <Stat label="In productie" value={String(inProduction.length)} icon={icons.studio} />
        <Stat label="Leads via content" value={String(leadsCount)} icon={icons.leads} />
      </div>

      {waitingApproval.length > 0 && (
        <Card className="p-5 mb-6 flex items-center justify-between gap-4 border-accent/20 bg-accent/[0.04]">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-accent/15 text-accent">{icons.check}</span>
            <div>
              <div className="font-medium text-sm">{waitingApproval.length} stuk(s) content wacht op je goedkeuring</div>
              <div className="text-[12px] text-muted">Bekijk en keur goed of vraag een revisie.</div>
            </div>
          </div>
          <Link href="/platform/approvals" className="rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2 transition-colors whitespace-nowrap">Bekijken</Link>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <Eyebrow>Pipeline</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-5">Status van je content</h2>
          <div className="space-y-3.5">
            {stageCounts.filter((s) => s.count > 0).map(({ st, count }) => (
              <div key={st}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground/80">{stageMeta[st].label}</span>
                  <span className="font-mono text-muted">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${(count / totalCards) * 100}%` }} />
                </div>
              </div>
            ))}
            {content.length === 0 && <p className="text-sm text-muted">Nog geen content.</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h2 className="font-display font-extrabold text-xl mb-5">Recent gepubliceerd</h2>
          <div className="space-y-2">
            {posted.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-white/[0.04] text-accent">{icons.pipeline}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-[12px] text-muted">{fmtNum(c.views ?? 0)} views · {c.leads ?? 0} leads</div>
                </div>
                {c.permalink && (
                  <a href={c.permalink} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent hover:text-accent-hover whitespace-nowrap">
                    Bekijk ↗
                  </a>
                )}
              </div>
            ))}
            {posted.length === 0 && <p className="text-sm text-muted">Nog niks live. Je eerste content is in productie.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
