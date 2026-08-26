// ════════════════════════════════════════════════════════════════
// Groeiplan-engine: kijkt naar de échte cijfers (retainers, leads,
// outreach, pipeline, facturen, contracten, kanalen) en vertaalt ze
// naar concrete volgende stappen richting het maanddoel. Regel-
// gebaseerd en volledig herleidbaar — elke actie zegt wáárom, met
// het cijfer erbij.
// ════════════════════════════════════════════════════════════════
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { todayStr } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getMoneybirdMonth } from "@/lib/integrations/moneybird";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface GrowthAction {
  priority: 1 | 2 | 3; // 1 = nu doen
  title: string;
  why: string;
  href: string;
  linkLabel: string;
}

export interface GrowthPlan {
  goal: number;
  mrr: number;
  invoicedThisMonth: number;
  paidThisMonth: number;
  gap: number;
  /** Hoeveel nieuwe retainers van gemiddelde grootte het gat dicht. */
  clientsNeeded: number | null;
  avgRetainer: number;
  actions: GrowthAction[];
}

export async function buildGrowthPlan(): Promise<GrowthPlan | null> {
  if (DEMO_MODE || !isSupabaseConfigured) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  return buildGrowthPlanWith(supabase);
}

// De cron gebruikt dezelfde engine met de service-client (geen sessie).
// Met een sessie-client filtert RLS al op de eigen agency; de
// service-client omzeilt RLS, dus dan is agencyId VERPLICHT om te
// voorkomen dat agencies elkaars cijfers in hun plan krijgen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildGrowthPlanWith(supabase: SupabaseClient<any, any, any>, agencyId?: string): Promise<GrowthPlan | null> {

  const today = todayStr();
  const in60 = todayStr(60);
  const daysAgo7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoped = (q: any) => (agencyId ? q.eq("agency_id", agencyId) : q);

  // Klanten eerst: leads en content hebben geen agency_id-kolom en
  // worden via de client-lijst van deze agency gefilterd.
  interface ClientRow { id: string; name: string; status: string; monthly_value: number | null; health: string | null; hidden: boolean | null }
  const { data: clients } = (await scoped(
    supabase.from("clients").select("id,name,status,monthly_value,health,hidden")
  )) as { data: ClientRow[] | null };
  const clientIds = (clients ?? []).map((c) => c.id);

  const agencyQuery = agencyId
    ? supabase.from("agencies").select("goal_monthly").eq("id", agencyId).maybeSingle()
    : supabase.from("agencies").select("goal_monthly").limit(1).maybeSingle();

  const [
    { data: agency },
    { data: leads },
    { data: prospects },
    { data: content },
    { data: contracts },
    { data: channelStats },
    month,
  ] = await Promise.all([
    agencyQuery,
    supabase.from("leads").select("id,name,stage,value,next_followup,created_at").in("client_id", clientIds),
    scoped(supabase.from("prospects").select("id,stage,dm_sent_at")) as Promise<{ data: { id: string; stage: string; dm_sent_at: string | null }[] | null }>,
    supabase.from("content").select("id,stage,deadline,editor_id").in("client_id", clientIds),
    scoped(supabase.from("contracts").select("id,title,status,ends_on")) as Promise<{ data: { id: string; title: string; status: string; ends_on: string | null }[] | null }>,
    scoped(supabase.from("channel_stats").select("channel,stat_date")).order("stat_date", { ascending: false }).limit(50) as Promise<{ data: { channel: string; stat_date: string }[] | null }>,
    getMoneybirdMonth(),
  ]);

  const goal = Number(agency?.goal_monthly ?? 100_000);
  const active = (clients ?? []).filter((c) => c.status !== "gepauzeerd" && !c.hidden);
  const mrr = active.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
  const avgRetainer = active.length ? Math.round(mrr / active.filter((c) => Number(c.monthly_value) > 0).length) || 0 : 0;
  const gap = Math.max(0, goal - mrr);

  const actions: GrowthAction[] = [];

  // ── 1. Het gat naar het doel ──────────────────────────────────
  // Menno's doel-pricing (eind 2026): retainers van €2-4K (reken met
  // €3K) + longform-upsell van ±4 video's × €800 = €3.2K per klant.
  // Dat scenario staat naast het huidige gemiddelde: zo zie je dat je
  // met de juiste pricing veel minder klanten nodig hebt.
  const TARGET_RETAINER = 3000;
  const TARGET_UPSELL = 3200;
  if (gap > 0 && avgRetainer > 0) {
    const needed = Math.ceil(gap / avgRetainer);
    const neededAtTarget = Math.ceil(gap / (TARGET_RETAINER + TARGET_UPSELL));
    actions.push({
      priority: 1,
      title: `Nog ${needed} klanten bij je huidige gemiddelde (€${avgRetainer.toLocaleString("nl-NL")}) — of ${neededAtTarget} bij doel-pricing`,
      why: `Gat: €${gap.toLocaleString("nl-NL")}/mnd. Bij je doel-pricing (retainer €${TARGET_RETAINER.toLocaleString("nl-NL")} + longform-upsell ±€${TARGET_UPSELL.toLocaleString("nl-NL")}) is elke klant €${(TARGET_RETAINER + TARGET_UPSELL).toLocaleString("nl-NL")}/mnd waard — prijs omhoog is de grootste hefboom.`,
      href: "/platform/outreach",
      linkLabel: "Naar outreach",
    });
  }

  // Upsell-kans: actieve klanten die nog onder de doel-retainer zitten.
  const belowTarget = active.filter((c) => Number(c.monthly_value) > 0 && Number(c.monthly_value) < TARGET_RETAINER);
  if (belowTarget.length > 0) {
    actions.push({
      priority: 2,
      title: `${belowTarget.length} klant${belowTarget.length === 1 ? "" : "en"} onder de doel-retainer — upsell longform`,
      why: `Eén longform per week (±€800/video, 40-60% marge) is ±€3.200/mnd extra per klant, bovenop het pad naar €2-4K retainers.`,
      href: "/platform/finance",
      linkLabel: "Naar finance",
    });
  }

  // ── 2. Outreach-tempo deze week ───────────────────────────────
  const sentThisWeek = (prospects ?? []).filter((p) => p.dm_sent_at && p.dm_sent_at >= daysAgo7).length;
  const stock = (prospects ?? []).filter((p) => p.stage === "te_contacteren").length;
  if (sentThisWeek < 75) {
    actions.push({
      priority: sentThisWeek < 30 ? 1 : 2,
      title: `Outreach-tempo: ${sentThisWeek} DM's in 7 dagen`,
      why: `Bij 5 per werkdag (25/week) blijft de pipeline gevuld; er staan ${stock} prospects klaar om te contacteren.`,
      href: "/platform/outreach",
      linkLabel: "DM's versturen",
    });
  }
  if (stock < 20) {
    actions.push({
      priority: 2,
      title: `Prospect-voorraad laag: nog ${stock} te contacteren`,
      why: "Onder de 20 droogt de wekelijkse outreach op — tijd voor een nieuwe researchronde (YouTube-first: kanalen die consistent posten maar blijven hangen).",
      href: "/platform/outreach",
      linkLabel: "Prospects toevoegen",
    });
  }

  // ── 3. Leads die liggen te verstoffen ─────────────────────────
  const openLeads = (leads ?? []).filter((l) => !["closed", "verloren", "geen_fit"].includes(String(l.stage)));
  const overdue = openLeads.filter((l) => l.next_followup && String(l.next_followup) < today);
  const noFollowup = openLeads.filter((l) => !l.next_followup);
  if (overdue.length) {
    actions.push({
      priority: 1,
      title: `${overdue.length} follow-up${overdue.length === 1 ? "" : "s"} over datum`,
      why: "Een lead die een week stil ligt is meestal weg — vandaag opvolgen kost minuten en redt deals.",
      href: "/platform/leads",
      linkLabel: "Follow-ups doen",
    });
  }
  if (noFollowup.length >= 3) {
    actions.push({
      priority: 2,
      title: `${noFollowup.length} open leads zonder follow-up-datum`,
      why: "Zonder datum bestaat de opvolging niet — zet bij elke lead wanneer je 'm weer aanraakt.",
      href: "/platform/leads",
      linkLabel: "Datums zetten",
    });
  }

  // ── 4. Geld dat er al is: open facturen ──────────────────────
  if (month.configured) {
    const late = month.invoices.filter((i) => i.state === "late");
    const open = month.invoices.filter((i) => i.state === "open" || i.state === "pending_payment");
    if (late.length) {
      actions.push({
        priority: 1,
        title: `${late.length} factu${late.length === 1 ? "ur" : "ren"} te laat`,
        why: `Er staat €${late.reduce((s, i) => s + i.totalExcl, 0).toLocaleString("nl-NL")} aan verlopen facturen open — een herinnering sturen is de snelste omzet van vandaag.`,
        href: "/platform/finance",
        linkLabel: "Naar Finance",
      });
    } else if (open.length >= 3) {
      actions.push({
        priority: 3,
        title: `${open.length} facturen staan nog open`,
        why: "Nog niet te laat, maar houd de betaaltermijnen in de gaten.",
        href: "/platform/finance",
        linkLabel: "Bekijken",
      });
    }
  }

  // ── 5. Levering: kaarten over hun deadline ────────────────────
  const lateCards = (content ?? []).filter(
    (c) => c.deadline && String(c.deadline) < today && !["posted", "ready_for_posting"].includes(String(c.stage))
  );
  if (lateCards.length) {
    actions.push({
      priority: lateCards.length >= 5 ? 1 : 2,
      title: `${lateCards.length} video's over hun deadline`,
      why: "Churn begint bij te laat leveren — check de tijdlijn en stuur de editors bij voordat de klant het meldt.",
      href: "/platform/pipeline?weergave=gantt",
      linkLabel: "Naar de tijdlijn",
    });
  }

  // ── 6. Klanten met risico ─────────────────────────────────────
  const atRisk = active.filter((c) => c.health === "risico");
  if (atRisk.length) {
    actions.push({
      priority: 1,
      title: `${atRisk.length} klant${atRisk.length === 1 ? "" : "en"} op risico`,
      why: `Behoud gaat vóór werving: €${atRisk.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0).toLocaleString("nl-NL")}/mnd staat op het spel (${atRisk.map((c) => c.name).join(", ")}).`,
      href: "/platform/clients",
      linkLabel: "Naar klanten",
    });
  }

  // ── 7. Contracten die aflopen ─────────────────────────────────
  const expiring = (contracts ?? []).filter(
    (c) => c.status === "getekend" && c.ends_on && String(c.ends_on) >= today && String(c.ends_on) <= in60
  );
  if (expiring.length) {
    actions.push({
      priority: 2,
      title: `${expiring.length} contract${expiring.length === 1 ? "" : "en"} lo${expiring.length === 1 ? "opt" : "pen"} binnen 60 dagen af`,
      why: "Verlengen is makkelijker dan vervangen — plan het gesprek vóór de einddatum.",
      href: "/platform/contracts",
      linkLabel: "Naar contracten",
    });
  }

  // ── 8. Eigen merk: kanalen bijgehouden? ───────────────────────
  const lastStat = (channelStats ?? [])[0]?.stat_date;
  if (!lastStat || String(lastStat) < new Date(Date.now() - 7 * 86_400_000).toLocaleDateString("sv-SE")) {
    actions.push({
      priority: 3,
      title: "Eigen kanalen al ruim een week niet bijgewerkt",
      why: "Je eigen merk is het beste verkoopargument — zet de sync aan of vul de weekcijfers in.",
      href: "/platform/channels",
      linkLabel: "Naar eigen kanalen",
    });
  }

  // ── 9. Upsell-kans: gemiddelde retainer omhoog ────────────────
  const smallClients = active.filter((c) => Number(c.monthly_value) > 0 && Number(c.monthly_value) < 1000);
  if (gap > 0 && smallClients.length >= 2) {
    actions.push({
      priority: 3,
      title: `${smallClients.length} klanten onder de €1.000/mnd`,
      why: "Een pakket-upgrade bij bestaande klanten is vaak sneller dan een nieuwe deal — bespreek meer output of een extra kanaal.",
      href: "/platform/finance",
      linkLabel: "Per klant bekijken",
    });
  }

  actions.sort((a, b) => a.priority - b.priority);

  return {
    goal,
    mrr,
    invoicedThisMonth: month.configured ? month.invoiced : 0,
    paidThisMonth: month.configured ? month.paid : 0,
    gap,
    clientsNeeded: avgRetainer > 0 ? Math.ceil(gap / avgRetainer) : null,
    avgRetainer,
    actions: actions.slice(0, 8),
  };
}
