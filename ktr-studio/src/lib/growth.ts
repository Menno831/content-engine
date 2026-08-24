// ════════════════════════════════════════════════════════════════
// Groeiplan-engine: kijkt naar de échte cijfers (retainers, leads,
// outreach, pipeline, facturen, contracten, kanalen) en vertaalt ze
// naar concrete volgende stappen richting het maanddoel. Regel-
// gebaseerd en volledig herleidbaar — elke actie zegt wáárom, met
// het cijfer erbij.
// ════════════════════════════════════════════════════════════════
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildGrowthPlanWith(supabase: SupabaseClient<any, any, any>): Promise<GrowthPlan | null> {

  const today = new Date().toLocaleDateString("sv-SE");
  const in60 = new Date(Date.now() + 60 * 86_400_000).toLocaleDateString("sv-SE");
  const daysAgo7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: agency },
    { data: clients },
    { data: leads },
    { data: prospects },
    { data: content },
    { data: contracts },
    { data: channelStats },
    month,
  ] = await Promise.all([
    supabase.from("agencies").select("goal_monthly").limit(1).maybeSingle(),
    supabase.from("clients").select("id,name,status,monthly_value,health,hidden"),
    supabase.from("leads").select("id,name,stage,value,next_followup,created_at"),
    supabase.from("prospects").select("id,stage,dm_sent_at"),
    supabase.from("content").select("id,stage,deadline,editor_id"),
    supabase.from("contracts").select("id,title,status,ends_on"),
    supabase.from("channel_stats").select("channel,stat_date").order("stat_date", { ascending: false }).limit(50),
    getMoneybirdMonth(),
  ]);

  const goal = Number(agency?.goal_monthly ?? 100_000);
  const active = (clients ?? []).filter((c) => c.status !== "gepauzeerd" && !c.hidden);
  const mrr = active.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
  const avgRetainer = active.length ? Math.round(mrr / active.filter((c) => Number(c.monthly_value) > 0).length) || 0 : 0;
  const gap = Math.max(0, goal - mrr);

  const actions: GrowthAction[] = [];

  // ── 1. Het gat naar het doel ──────────────────────────────────
  if (gap > 0 && avgRetainer > 0) {
    const needed = Math.ceil(gap / avgRetainer);
    actions.push({
      priority: 1,
      title: `Nog ${needed} klanten van gemiddeld €${avgRetainer.toLocaleString("nl-NL")} tot je doel`,
      why: `MRR is €${mrr.toLocaleString("nl-NL")} van de €${goal.toLocaleString("nl-NL")} — het gat is €${gap.toLocaleString("nl-NL")}/mnd. Elke deal telt dubbel: nieuwe klant + referral-kans.`,
      href: "/platform/outreach",
      linkLabel: "Naar outreach",
    });
  }

  // ── 2. Outreach-tempo deze week ───────────────────────────────
  const sentThisWeek = (prospects ?? []).filter((p) => p.dm_sent_at && p.dm_sent_at >= daysAgo7).length;
  const stock = (prospects ?? []).filter((p) => p.stage === "te_contacteren").length;
  if (sentThisWeek < 25) {
    actions.push({
      priority: sentThisWeek < 10 ? 1 : 2,
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
