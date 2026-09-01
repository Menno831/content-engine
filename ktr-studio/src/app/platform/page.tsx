import Link from "next/link";
import { todayStr } from "@/lib/dates";
import { stageMeta, fmtEur, fmtNum, type PipelineStage, type ContentCard } from "./_data";
import { Card, Stat, PageHeader, Avatar, Badge, icons, Eyebrow } from "./_components";
import { getWorkspaceData, getTodaysBrief } from "@/lib/data";
import { getTodos } from "@/lib/notifications";
import { getSessionContext } from "@/lib/auth";
import { getOutreachTodoCount } from "@/lib/prospects";
import { AdsStrip } from "./AdsStrip";
import { getMeetings, getEodReports } from "@/lib/workspace";
import { getOrCreateBriefing, type Briefing } from "@/lib/briefing";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const maxDuration = 60; // AI-calls mogen even duren

export default async function Dashboard() {
  const [{ clients, content: contentCards, leads, demo }, todos, ctx, outreachTodo, meetings, eods] = await Promise.all([
    getWorkspaceData(),
    getTodos(),
    getSessionContext(),
    getOutreachTodoCount(),
    getMeetings({ fromToday: true, limit: 20 }).catch(() => []),
    getEodReports(20).catch(() => []),
  ]);

  // Editor-login: het dashboard is agency-cijfers — door naar het board.
  if (ctx.profile?.role === "editor") redirect("/platform/pipeline");

  // Klant-login: eigen overzicht i.p.v. agency-cijfers.
  if (ctx.profile?.role === "client") {
    return <ClientOverview content={contentCards} clientName={ctx.clientName ?? "je merk"} leadsCount={leads.length} />;
  }

  const brief = await getTodaysBrief();

  // De ochtendbriefing van Jarvis — dezelfde als op de Jarvis-pagina.
  let briefing: Briefing | null = null;
  try {
    const sb = await supabaseServer();
    if (sb && ctx.agency) briefing = await getOrCreateBriefing(sb, ctx.agency.id);
  } catch {
    briefing = null;
  }
  const activeClients = clients.filter((c) => c.status === "actief").length;
  const totalLeads = clients.reduce((s, c) => s + c.leadsThisMonth, 0);

  // Datums voor de 'Vandaag'-rij (server-side, één keer per request).
  const today = todayStr();
  const in3days = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

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

  return (
    <>
      <GreetingHeader name={ctx.profile?.full_name ?? null} />

      <TodayStrip
        meetings={meetings.filter((m) => m.startsAt.slice(0, 10) === today)}
        eodDone={eods.some((e) => e.date === today && e.userId === ctx.user?.id)}
        eodCount={eods.filter((e) => e.date === today).length}
      />

      {briefing && (
        <Card className="p-5 mb-6 border-sky-400/15 bg-sky-400/[0.03]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-sky-400/15 text-sky-300">☀️</span>
              <div>
                <div className="font-display font-bold">Briefing van vandaag</div>
                <div className="text-[12px] text-muted">{briefing.ai ? "Door Jarvis geschreven" : "Op basis van je echte cijfers"}</div>
              </div>
            </div>
            <Link href="/platform/jarvis" className="text-[13px] text-accent hover:text-accent-hover whitespace-nowrap">
              🎙 Praat met Jarvis
            </Link>
          </div>
          <p className="text-[13.5px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{briefing.content}</p>
        </Card>
      )}

      {/* Vandaag: wat moet er NU gebeuren (commandopost) */}
      <ActionRow
        followupsDue={
          leads.filter((l) => l.nextFollowup && l.nextFollowup <= today && l.stage !== "closed" && l.stage !== "verloren").length
        }
        deadlinesSoon={
          contentCards.filter((c) => c.stage !== "posted" && c.dateISO && c.dateISO.slice(0, 10) <= in3days).length
        }
        waitingApproval={contentCards.filter((c) => c.stage === "client_approval").length}
        todosOpen={todos.filter((t) => !t.done).length}
        outreachTodo={outreachTodo}
      />

      {/* Advertenties: alleen zichtbaar zodra er data is */}
      <AdsStrip />

      {/* Daily Brief teaser: vandaag's verse ideeën */}
      {brief.length > 0 && (
        <Card className="p-5 mb-6 border-accent/15 bg-accent/[0.03]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent">{icons.spark}</span>
              <div>
                <div className="font-display font-bold">Daily Brief</div>
                <div className="text-[12px] text-muted">{brief.length} verse ideeën voor vandaag</div>
              </div>
            </div>
            <Link href="/platform/brief" className="text-[13px] text-accent hover:text-accent-hover flex items-center gap-1 whitespace-nowrap">
              Alles bekijken {icons.arrowRight}
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {brief.slice(0, 3).map((idea) => (
              <Link key={idea.id} href="/platform/brief" className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3.5 hover:border-accent/25 transition-all">
                <div className="text-[11px] font-mono uppercase tracking-wider text-accent mb-1 truncate">{idea.clientName}</div>
                <div className="text-[13px] font-medium leading-snug mb-1">{idea.title}</div>
                {idea.hook && <p className="text-[12px] text-muted leading-snug line-clamp-2">&ldquo;{idea.hook}&rdquo;</p>}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* KPI's — productie-gericht (omzet-uit-content staat op non-actief tot er echte attributie is) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Actieve klanten" value={String(activeClients)} icon={icons.clients} />
        <Stat label="In productie" value={String(contentCards.filter((c) => c.stage !== "posted").length)} icon={icons.pipeline} />
        <Stat label="Live geplaatst" value={String(contentCards.filter((c) => c.stage === "posted").length)} icon={icons.check} />
        <Stat label="Leads deze maand" value={String(totalLeads)} icon={icons.leads} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pipeline status */}
        <Card className="lg:col-span-2 p-6">
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

// Commandopost-rij: de vier dingen die vandaag aandacht vragen,
// elk met een directe link naar de juiste pagina. Urgent = rood.
// Puur: telt zelf niets, krijgt de getallen kant-en-klaar binnen.
function ActionRow({
  followupsDue,
  deadlinesSoon,
  waitingApproval,
  todosOpen,
  outreachTodo,
}: {
  followupsDue: number;
  deadlinesSoon: number;
  waitingApproval: number;
  todosOpen: number;
  outreachTodo: number;
}) {
  const items = [
    { label: "Vandaag opvolgen", count: followupsDue, href: "/platform/leads", urgent: followupsDue > 0 },
    { label: "Deadline ≤ 3 dagen", count: deadlinesSoon, href: "/platform/pipeline", urgent: deadlinesSoon > 0 },
    { label: "Wacht op klant-akkoord", count: waitingApproval, href: "/platform/approvals", urgent: false },
    { label: "Open taken", count: todosOpen, href: "/platform/todos", urgent: false },
    { label: "Outreach te contacteren", count: outreachTodo, href: "/platform/outreach", urgent: false },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          className={`group rounded-2xl border p-4 transition-all ${
            it.urgent
              ? "border-red-400/30 bg-red-400/[0.05] hover:border-red-400/50"
              : it.count > 0
                ? "border-white/[0.08] bg-white/[0.015] hover:border-accent/30"
                : "border-white/[0.05] bg-white/[0.01] opacity-70 hover:opacity-100"
          }`}
        >
          <div className={`font-display font-extrabold text-2xl mb-0.5 ${it.urgent ? "text-red-300" : it.count > 0 ? "" : "text-muted"}`}>
            {it.count}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted leading-tight">{it.label}</span>
            <span className="text-muted group-hover:text-accent transition-colors">{icons.arrowRight}</span>
          </div>
        </Link>
      ))}
    </div>
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

  // Datums voor de 'Vandaag'-rij (server-side, één keer per request).
  const today = todayStr();
  const in3days = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

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


// Persoonlijke kop: begroeting op het uur van de dag + datum.
function GreetingHeader({ name }: { name: string | null }) {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Nog wakker" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const first = (name ?? "").split(" ")[0];
  return (
    <div className="mb-6">
      <h1 className="font-display font-extrabold text-3xl">
        {greeting}
        {first ? `, ${first}` : ""}
      </h1>
      <p className="text-muted text-sm mt-1">
        {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

// Wat er vandaag speelt: calls van vandaag + of de dag al afgesloten is.
function TodayStrip({
  meetings,
  eodDone,
  eodCount,
}: {
  meetings: { id: string; title: string; startsAt: string; clientName: string | null }[];
  eodDone: boolean;
  eodCount: number;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold">Calls vandaag</div>
          <Link href="/platform/agenda" className="text-[12px] text-accent hover:text-accent-hover transition-colors">
            Agenda →
          </Link>
        </div>
        {meetings.length === 0 ? (
          <p className="text-[13px] text-muted">Geen calls gepland vandaag.</p>
        ) : (
          <div className="space-y-1.5">
            {meetings.map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-[13px]">
                <span className="font-mono text-accent shrink-0">
                  {new Date(m.startsAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="truncate">{m.title}</span>
                {m.clientName && <span className="text-muted text-[12px] shrink-0">{m.clientName}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={`p-5 ${eodDone ? "" : "border-accent/25 bg-accent/[0.04]"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold">Dag afsluiten</div>
          <span className="text-[12px] text-muted">{eodCount} vandaag ingediend</span>
        </div>
        {eodDone ? (
          <p className="text-[13px] text-emerald-400">Jouw EOD staat er ✓</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted">Nog niet ingevuld.</p>
            <Link
              href="/platform/eod"
              className="rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[12.5px] px-3 py-1.5 transition-colors shrink-0"
            >
              EOD invullen
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
