// ════════════════════════════════════════════════════════════════
// De bewaker: draait elke ochtend en doet drie dingen.
//
// 1. SIGNALEREN — scant de data op dingen die aandacht vragen (late
//    facturen, follow-ups over datum, deadlines, aflopende
//    contracten, lage prospect-voorraad) en zet ze als notificatie
//    in de bel. Dedupe: hetzelfde signaal max. 1× per 3 dagen.
// 2. DM-CONCEPTEN — schrijft met AI concept-DM's voor prospects in
//    de wachtrij die er nog geen hebben (max. 10 per dag).
//    Versturen blijft ALTIJD handmatig.
// 3. WEEKANALYSE — op maandag een korte strategische AI-analyse
//    bovenop het groeiplan, opgeslagen in growth_notes.
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "@/lib/dates";
import { buildGrowthPlanWith, type GrowthPlan } from "@/lib/growth";
import { generateText } from "@/lib/ai";
import { getOrCreateBriefing } from "@/lib/briefing";
import { moneybirdConfigured, getMoneybirdMonth } from "@/lib/integrations/moneybird";

export interface WatchdogResult {
  notifications: number;
  dmDrafts: number;
  weeklyNote: boolean;
  briefing: boolean;
  selftest: string[];
  errors: string[];
}

// Zelfde signaal niet vaker dan eens per 3 dagen herhalen.
async function notifyOnce(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  agencyId: string,
  title: string,
  body: string,
  link: string
): Promise<boolean> {
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("title", title)
    .gte("created_at", since)
    .limit(1);
  if (existing?.length) return false;

  const { error } = await admin.from("notifications").insert({
    agency_id: agencyId,
    audience: "agency",
    type: "info",
    title,
    body,
    link,
  });
  if (error) throw new Error(`notificatie mislukt: ${error.message}`);
  return true;
}

// DM in Menno's stem, volgens de vaste regels. De AI krijgt de
// context van de prospect en de stijlregels; het resultaat is een
// CONCEPT dat in de wachtrij klaarstaat.
export const DM_TEMPLATE = `Je schrijft een eerste Instagram-DM namens Menno Kater, een content-strateeg die founders helpt met YouTube en Reels.

STIJLREGELS (hard):
- Geen punten, komma's, trema's of gedachtestreepjes. Een vraagteken mag wel
- Begin met "Hey" (nooit "Hé")
- 2 tot 4 korte regels, elk op een eigen regel
- Positief en oprecht nieuwsgierig, NOOIT kritiek of negging op hun cijfers of kanaal
- Geen pitch, geen "ik kan je helpen", geen links
- Bied gratis waarde of stel een echte vraag over hun content
- Spreektaal, licht informeel (mag "snap je" of "man" bevatten maar niet geforceerd)
- Nederlands

CONTEXT PROSPECT:
{{onderwerp}}

Schrijf alleen de DM zelf, geen uitleg eromheen.`;

const WEEKLY_TEMPLATE = `Je bent de strategisch adviseur van Menno Kater (content-agency; het maanddoel staat als 'doel' in de JSON). Hieronder de actuele cijfers als JSON. Schrijf een korte analyse in het Nederlands: wat valt op, wat is dé hefboom voor komende week, en één concreet dagelijks gedrag dat het verschil maakt. Maximaal 130 woorden, geen opsomming van de cijfers zelf, geen inleiding, direct de inhoud. Nuchter en direct, geen em-dashes.

{{onderwerp}}`;

// De prompt-context voor een concept-DM — gedeeld door de nachtelijke
// cron en de "Schrijf concept-DM"-knop, zodat beide dezelfde stijl leveren.
export function prospectDmContext(p: {
  name: string;
  instagram?: string | null;
  youtube?: string | null;
  weakness?: string | null;
  note?: string | null;
}): string {
  return [
    `Naam: ${p.name}`,
    p.instagram ? `Instagram: ${p.instagram}` : null,
    p.youtube ? `YouTube: ${p.youtube}` : null,
    p.weakness ? `Observatie (alleen als positieve invalshoek gebruiken, niet benoemen als zwakte): ${p.weakness}` : null,
    p.note ? `Notitie: ${p.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// De strategische analyse op het groeiplan — gedeeld door de
// maandag-cron en de "Ververs analyse"-knop op Groei.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeGrowthAnalysis(db: any, agencyId: string, plan: GrowthPlan): Promise<{ note?: string; error?: string }> {
  const { text, mock } = await generateText({
    template: WEEKLY_TEMPLATE,
    input: JSON.stringify({
      doel: plan.goal,
      mrr: plan.mrr,
      gat: plan.gap,
      gefactureerd_deze_maand: plan.invoicedThisMonth,
      betaald: plan.paidThisMonth,
      gemiddelde_retainer: plan.avgRetainer,
      acties: plan.actions.map((a) => `${a.title} (${a.why})`),
    }),
    model: "smart",
  });
  if (mock) return { error: "ANTHROPIC_API_KEY niet beschikbaar in runtime" };

  const note = text.trim();
  const { error } = await db.from("growth_notes").insert({ agency_id: agencyId, note });
  if (error) return { error: `opslaan: ${error.message}` };
  return { note };
}

export async function runWatchdog(): Promise<WatchdogResult> {
  const result: WatchdogResult = { notifications: 0, dmDrafts: 0, weeklyNote: false, briefing: false, selftest: [], errors: [] };
  const admin = createAdminClient();
  if (!admin) {
    result.errors.push("geen serverkey");
    return result;
  }

  const { data: agencies } = await admin.from("agencies").select("id");
  const today = todayStr();
  const in30 = todayStr(30);

  for (const agency of agencies ?? []) {
    const agencyId = agency.id as string;

    // Eén plan per agency: stap 1, 3 en de briefing kijken naar
    // dezelfde cijfers en Moneybird wordt maar één keer bevraagd.
    let agencyPlan: GrowthPlan | null = null;

    // ── 1. Signaleringen ─────────────────────────────────────────
    try {
      const plan: GrowthPlan | null = await buildGrowthPlanWith(admin, agencyId);
      agencyPlan = plan;

      if (plan) {
        // De prioriteit-1-acties van het groeiplan zijn de signalen.
        for (const a of plan.actions.filter((x) => x.priority === 1)) {
          const sent = await notifyOnce(admin, agencyId, a.title, a.why, a.href);
          if (sent) result.notifications += 1;
        }
      }

      // Contracten die binnen 30 dagen aflopen (het plan kijkt 60).
      const { data: expiring } = await admin
        .from("contracts")
        .select("title, ends_on")
        .eq("agency_id", agencyId)
        .eq("status", "getekend")
        .gte("ends_on", today)
        .lte("ends_on", in30);
      for (const c of expiring ?? []) {
        const sent = await notifyOnce(
          admin,
          agencyId,
          `Contract "${c.title}" loopt af`,
          `Einddatum ${new Date(String(c.ends_on)).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} — plan het verlenggesprek.`,
          "/platform/contracts"
        );
        if (sent) result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`signalen: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 2. AI-concept-DM's (max 10 per dag) ──────────────────────
    try {
      const { data: pending } = await admin
        .from("prospects")
        .select("id, name, instagram, youtube, weakness, note")
        .eq("agency_id", agencyId)
        .eq("stage", "te_contacteren")
        .is("message", null)
        .limit(10);

      let drafted = 0;
      for (const p of pending ?? []) {
        const { text, mock } = await generateText({ template: DM_TEMPLATE, input: prospectDmContext(p), model: "smart" });
        if (mock) {
          result.errors.push("dm-concepten: ANTHROPIC_API_KEY niet beschikbaar in runtime");
          break;
        }

        const { error } = await admin
          .from("prospects")
          .update({ message: text.trim(), message_generated_at: new Date().toISOString() })
          .eq("id", p.id)
          .is("message", null); // nooit een handgeschreven bericht overschrijven
        if (error) result.errors.push(`dm-concept opslaan (${p.name}): ${error.message}`);
        else drafted += 1;
      }
      result.dmDrafts += drafted;

      if (drafted > 0) {
        await notifyOnce(
          admin,
          agencyId,
          `${drafted} concept-DM's klaargezet`,
          "De AI schreef concepten voor prospects zonder bericht. Lees ze na en verstuur zelf wat goed voelt.",
          "/platform/outreach"
        );
        result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`dm-concepten: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3. Weekanalyse (alleen maandag) ──────────────────────────
    try {
      const isMonday = new Date().getDay() === 1;
      if (isMonday) {
        const plan = agencyPlan ?? (await buildGrowthPlanWith(admin, agencyId));
        if (plan) {
          const r = await writeGrowthAnalysis(admin, agencyId, plan);
          if (r.error) result.errors.push(`weekanalyse: ${r.error}`);
          else result.weeklyNote = true;
        }
      }
    } catch (e) {
      result.errors.push(`weekanalyse: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 4. Ochtendbriefing klaarzetten ───────────────────────────
    try {
      const b = await getOrCreateBriefing(admin, agencyId, agencyPlan);
      if (b) result.briefing = true;
    } catch (e) {
      result.errors.push(`briefing: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 5. Zelftest: kapotte koppelingen zelf detecteren en melden ─
    try {
      const defects: string[] = [];

      // Anthropic: een mini-testcall — leeg/kapot is een defect dat
      // AI-DM's, weekanalyse, briefing-AI, Studio en Boost blokkeert.
      try {
        const { mock } = await generateText({ template: "Antwoord met exact: ok", input: "", model: "fast" });
        if (mock) defects.push("ANTHROPIC_API_KEY ontbreekt of is leeg — AI staat uit (Studio, Boost, DM-concepten, weekanalyse)");
      } catch {
        defects.push("ANTHROPIC_API_KEY is kapot (API weigert) — zet de key opnieuw in Vercel");
      }

      if (!moneybirdConfigured()) {
        defects.push("MONEYBIRD_API_TOKEN ontbreekt — Finance toont geen facturen");
      } else {
        const m = await getMoneybirdMonth();
        if (!m.configured) defects.push("Moneybird-koppeling faalt — controleer token en administratie-id");
      }

      if (!process.env.RAPIDAPI_KEY) defects.push("RAPIDAPI_KEY ontbreekt — Instagram-sync staat uit");
      if (!process.env.YOUTUBE_API_KEY) defects.push("YOUTUBE_API_KEY ontbreekt — YouTube-stats en eigen-kanaal-sync wachten");
      if (!process.env.RESEND_API_KEY) defects.push("RESEND_API_KEY ontbreekt — editor- en rapportmails staan uit");

      result.selftest = defects;
      for (const d of defects) {
        const sent = await notifyOnce(admin, agencyId, `Zelftest: ${d.split(" — ")[0]}`, d, "/platform/settings");
        if (sent) result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`zelftest: ${e instanceof Error ? e.message : "onbekend"}`);
    }
  }

  return result;
}
