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
import { buildGrowthPlanWith, type GrowthPlan } from "@/lib/growth";
import { generateText } from "@/lib/ai";

export interface WatchdogResult {
  notifications: number;
  dmDrafts: number;
  weeklyNote: boolean;
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

const WEEKLY_TEMPLATE = `Je bent de strategisch adviseur van Menno Kater (content-agency, doel €100K/mnd). Hieronder de actuele cijfers als JSON. Schrijf een korte analyse in het Nederlands: wat valt op, wat is dé hefboom voor komende week, en één concreet dagelijks gedrag dat het verschil maakt. Maximaal 130 woorden, geen opsomming van de cijfers zelf, geen inleiding, direct de inhoud. Nuchter en direct, geen em-dashes.

{{onderwerp}}`;

export async function runWatchdog(): Promise<WatchdogResult> {
  const result: WatchdogResult = { notifications: 0, dmDrafts: 0, weeklyNote: false, errors: [] };
  const admin = createAdminClient();
  if (!admin) {
    result.errors.push("geen serverkey");
    return result;
  }

  const { data: agencies } = await admin.from("agencies").select("id");
  const today = new Date().toLocaleDateString("sv-SE");
  const in30 = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString("sv-SE");

  for (const agency of agencies ?? []) {
    const agencyId = agency.id as string;

    // ── 1. Signaleringen ─────────────────────────────────────────
    try {
      const plan: GrowthPlan | null = await buildGrowthPlanWith(admin);

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

      for (const p of pending ?? []) {
        const context = [
          `Naam: ${p.name}`,
          p.instagram ? `Instagram: ${p.instagram}` : null,
          p.youtube ? `YouTube: ${p.youtube}` : null,
          p.weakness ? `Observatie (alleen als positieve invalshoek gebruiken, niet benoemen als zwakte): ${p.weakness}` : null,
          p.note ? `Notitie: ${p.note}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const { text, mock } = await generateText({ template: DM_TEMPLATE, input: context, model: "smart" });
        if (mock) {
          result.errors.push("dm-concepten: ANTHROPIC_API_KEY niet beschikbaar in runtime");
          break;
        }

        const { error } = await admin
          .from("prospects")
          .update({ message: text.trim(), message_generated_at: new Date().toISOString() })
          .eq("id", p.id)
          .is("message", null); // nooit een handgeschreven bericht overschrijven
        if (!error) result.dmDrafts += 1;
      }

      if (result.dmDrafts > 0) {
        await notifyOnce(
          admin,
          agencyId,
          `${result.dmDrafts} concept-DM's klaargezet`,
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
        const plan = await buildGrowthPlanWith(admin);
        if (plan) {
          const { text, mock } = await generateText({
            template: WEEKLY_TEMPLATE,
            input: JSON.stringify({
              doel: plan.goal,
              mrr: plan.mrr,
              gat: plan.gap,
              gefactureerd_deze_maand: plan.invoicedThisMonth,
              betaald: plan.paidThisMonth,
              acties: plan.actions.map((a) => a.title),
            }),
            model: "smart",
          });
          if (mock) {
            result.errors.push("weekanalyse: ANTHROPIC_API_KEY niet beschikbaar in runtime");
          } else {
            const { error } = await admin.from("growth_notes").insert({ agency_id: agencyId, note: text.trim() });
            if (error) result.errors.push(`weekanalyse opslaan: ${error.message}`);
            else result.weeklyNote = true;
          }
        }
      }
    } catch (e) {
      result.errors.push(`weekanalyse: ${e instanceof Error ? e.message : "onbekend"}`);
    }
  }

  return result;
}
