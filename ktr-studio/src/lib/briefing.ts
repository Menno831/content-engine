// ════════════════════════════════════════════════════════════════
// De ochtendbriefing: wat Jarvis je vertelt als je vraagt "brief me".
// Regelgebaseerd opgebouwd uit echte data — werkt dus ook zonder
// AI-key. Staat de key wél, dan herschrijft Claude 'm tot een
// vloeiend verhaal. Eén briefing per dag, opgeslagen in `briefings`.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayStr } from "@/lib/dates";
import { buildGrowthPlanWith, type GrowthPlan } from "@/lib/growth";
import { generateText } from "@/lib/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const BRIEFING_TEMPLATE = `Je bent Jarvis, de persoonlijke assistent van Menno Kater (content-agency; het maanddoel staat als bedrag in de briefing zelf). Hieronder staat de ruwe ochtendbriefing met echte cijfers. Herschrijf hem tot een korte gesproken briefing in het Nederlands: direct, energiek maar nuchter, alsof je hem 's ochtends even bijpraat. Begin met "Goedemorgen Menno". Noem alleen wat er echt staat, verzin niets. Maximaal 150 woorden, geen opsommingstekens, geen em-dashes.

{{onderwerp}}`;

export interface Briefing {
  date: string;
  content: string;
  ai: boolean;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

// De feiten van vandaag, in leesbare regels. Dit is de bron van de
// briefing én de fallback als AI niet beschikbaar is.
// agencyId is verplicht bij een service-client (RLS-bypass); met een
// sessie-client filtert RLS zelf al. Een al gebouwd plan mag mee om
// dubbele Moneybird/Supabase-rondes te voorkomen.
export async function buildBriefingFacts(db: Db, agencyId?: string, prebuiltPlan?: GrowthPlan | null): Promise<string> {
  const today = todayStr();
  const tomorrow = todayStr(1);
  const yesterday = todayStr(-1);

  let meetingsQ = db
    .from("meetings")
    .select("title, starts_at, client_id")
    .gte("starts_at", `${today}T00:00:00`)
    .lt("starts_at", `${tomorrow}T00:00:00`)
    .order("starts_at");
  if (agencyId) meetingsQ = meetingsQ.eq("agency_id", agencyId);
  let eodQ = db.from("eod_reports").select("full_name").eq("eod_date", yesterday);
  if (agencyId) eodQ = eodQ.eq("agency_id", agencyId);

  // content hangt aan clients, niet aan de agency — dus via de klantlijst.
  let clientIds: string[] | null = null;
  if (agencyId) {
    const { data: cl } = await db.from("clients").select("id").eq("agency_id", agencyId);
    clientIds = (cl ?? []).map((c) => c.id as string);
  }
  let dueQ = db
    .from("content")
    .select("title, stage")
    .eq("deadline", today)
    .not("stage", "in", '("posted","ready_for_posting")');
  if (clientIds) dueQ = dueQ.in("client_id", clientIds);

  const [plan, { data: meetings }, { data: dueCards }, { data: eod }] = await Promise.all([
    prebuiltPlan !== undefined ? Promise.resolve(prebuiltPlan) : buildGrowthPlanWith(db, agencyId),
    meetingsQ,
    dueQ,
    eodQ,
  ]);

  const lines: string[] = [];
  const dagStr = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  lines.push(`Vandaag is het ${dagStr}.`);

  if (plan) {
    lines.push(
      `Stand richting het doel: ${fmtEur(plan.mrr)} MRR van de ${fmtEur(plan.goal)} (${Math.round((plan.mrr / plan.goal) * 100)}%). Deze maand ${fmtEur(plan.invoicedThisMonth)} gefactureerd waarvan ${fmtEur(plan.paidThisMonth)} betaald.`
    );
    const top = plan.actions.filter((a) => a.priority === 1).slice(0, 3);
    if (top.length) {
      lines.push(`Belangrijkste acties: ${top.map((a) => a.title).join("; ")}.`);
    }
  }

  if (meetings?.length) {
    const list = meetings
      .map((m) => `${new Date(m.starts_at as string).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} ${m.title}`)
      .join(", ");
    lines.push(`Agenda vandaag: ${list}.`);
  } else {
    lines.push("Geen calls in de agenda vandaag — een goede dag voor opnames of outreach.");
  }

  if (dueCards?.length) {
    lines.push(`Deadlines vandaag: ${dueCards.map((c) => c.title).join(", ")}.`);
  }

  if (eod?.length) {
    lines.push(`Gisteren sloten ${eod.length} teamleden hun dag af met een EOD.`);
  }

  return lines.join("\n");
}

// Haal (of maak) de briefing van vandaag. Bestaat er al één zonder
// AI-laag terwijl de key inmiddels werkt, dan upgraden we hem.
export async function getOrCreateBriefing(db: Db, agencyId: string, prebuiltPlan?: GrowthPlan | null): Promise<Briefing | null> {
  const today = todayStr();

  const { data: existing } = await db
    .from("briefings")
    .select("content, ai, brief_date")
    .eq("agency_id", agencyId)
    .eq("brief_date", today)
    .maybeSingle();
  if (existing?.ai) {
    return { date: existing.brief_date as string, content: existing.content as string, ai: true };
  }

  const facts = await buildBriefingFacts(db, agencyId, prebuiltPlan);

  // AI-laag: mooi als het kan, feiten als fallback.
  let content = facts;
  let ai = false;
  try {
    const { text, mock } = await generateText({ template: BRIEFING_TEMPLATE, input: facts, model: "fast" });
    if (!mock && text.trim()) {
      content = text.trim();
      ai = true;
    }
  } catch {
    // feiten-fallback blijft staan
  }

  const { error } = await db
    .from("briefings")
    .upsert({ agency_id: agencyId, brief_date: today, content, ai }, { onConflict: "agency_id,brief_date" });
  if (error) return { date: today, content, ai }; // toon 'm alsnog

  return { date: today, content, ai };
}
