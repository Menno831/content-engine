// ════════════════════════════════════════════════════════════════
// De ochtendbriefing: wat Jarvis je vertelt als je vraagt "brief me".
// Regelgebaseerd opgebouwd uit echte data — werkt dus ook zonder
// AI-key. Staat de key wél, dan herschrijft Claude 'm tot een
// vloeiend verhaal. Eén briefing per dag, opgeslagen in `briefings`.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildGrowthPlanWith } from "@/lib/growth";
import { generateText } from "@/lib/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const BRIEFING_TEMPLATE = `Je bent Jarvis, de persoonlijke assistent van Menno Kater (content-agency, onderweg naar €100K/mnd). Hieronder staat de ruwe ochtendbriefing met echte cijfers. Herschrijf hem tot een korte gesproken briefing in het Nederlands: direct, energiek maar nuchter, alsof je hem 's ochtends even bijpraat. Begin met "Goedemorgen Menno". Noem alleen wat er echt staat, verzin niets. Maximaal 150 woorden, geen opsommingstekens, geen em-dashes.

{{onderwerp}}`;

export interface Briefing {
  date: string;
  content: string;
  ai: boolean;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

// De feiten van vandaag, in leesbare regels. Dit is de bron van de
// briefing én de fallback als AI niet beschikbaar is.
export async function buildBriefingFacts(db: Db): Promise<string> {
  const today = new Date().toLocaleDateString("sv-SE");
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("sv-SE");
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE");

  const [plan, { data: meetings }, { data: dueCards }, { data: eod }] = await Promise.all([
    buildGrowthPlanWith(db),
    db
      .from("meetings")
      .select("title, starts_at, client_id")
      .gte("starts_at", `${today}T00:00:00`)
      .lt("starts_at", `${tomorrow}T00:00:00`)
      .order("starts_at"),
    db
      .from("content")
      .select("title, stage")
      .eq("deadline", today)
      .not("stage", "in", '("posted","ready_for_posting")'),
    db.from("eod_reports").select("full_name").eq("eod_date", yesterday),
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
export async function getOrCreateBriefing(db: Db, agencyId: string): Promise<Briefing | null> {
  const today = new Date().toLocaleDateString("sv-SE");

  const { data: existing } = await db
    .from("briefings")
    .select("content, ai, brief_date")
    .eq("agency_id", agencyId)
    .eq("brief_date", today)
    .maybeSingle();
  if (existing?.ai) {
    return { date: existing.brief_date as string, content: existing.content as string, ai: true };
  }

  const facts = await buildBriefingFacts(db);

  // AI-laag: mooi als het kan, feiten als fallback.
  let content = facts;
  let ai = false;
  try {
    const { text, mock } = await generateText({ template: BRIEFING_TEMPLATE, input: facts, model: "smart" });
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
