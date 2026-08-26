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
import { frameioConfigured, listProjectFiles, matchesTitle } from "@/lib/frameio";
import { findInstagramViaYoutube } from "@/lib/sync/ig-fill";
import { qualifyProspect } from "@/lib/qualify";
import { runFeedScan } from "@/lib/feedscan";
import { getOrCreateBriefing } from "@/lib/briefing";
import { moneybirdConfigured, getMoneybirdMonth, getMoneybirdDrafts } from "@/lib/integrations/moneybird";

export interface WatchdogResult {
  notifications: number;
  dmDrafts: number;
  weeklyNote: boolean;
  briefing: boolean;
  selftest: string[];
  frameio?: number;
  igFilled?: number;
  errors: string[];
}

// Taak aanmaken als die er nog niet is: zelfde titel in de laatste
// 14 dagen (open of afgevinkt) = overslaan. Zo landen blijvende
// blokkades en terugkerende verplichtingen vanzelf in Taken zonder
// dat de lijst volloopt met dubbelen.
async function todoOnce(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  agencyId: string,
  title: string,
  urgency: "vandaag" | "later",
  due?: string
): Promise<boolean> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data: existing } = await admin
    .from("todos")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("title", title)
    .gte("created_at", since)
    .limit(1);
  if (existing?.length) return false;
  const { error } = await admin.from("todos").insert({
    agency_id: agencyId,
    client_id: null,
    title,
    urgency,
    due: due ?? null,
  });
  return !error;
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

// Zachte follow-up na een week stilte: luchtig, geen druk, geen pitch.
const FOLLOWUP_TEMPLATE = `Je schrijft een korte follow-up-DM namens Menno Kater. De eerste DM (positief, nieuwsgierig, geen pitch) bleef een week onbeantwoord. Schrijf één zachte tweede DM.

STIJLREGELS (hard):
- Geen punten, komma's, trema's of gedachtestreepjes. Een vraagteken mag wel
- 1 tot 2 korte regels, luchtig en zonder enige druk of verwijt
- NIET verwijzen naar "mijn vorige bericht" op een zeurende manier
- Geen pitch, geen links
- Nederlands, spreektaal

CONTEXT PROSPECT:
{{onderwerp}}

Schrijf alleen de DM zelf.`;

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

    // ── 3b. Outreach-hygiëne: 7 dagen stil na een DM → geen_reactie ─
    try {
      const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: stale } = await admin
        .from("prospects")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("stage", "dm_verstuurd")
        .lt("dm_sent_at", cutoff)
        .is("last_reply_at", null);
      if (stale?.length) {
        await admin
          .from("prospects")
          .update({ stage: "geen_reactie" })
          .in("id", stale.map((x) => x.id));
        const sent = await notifyOnce(
          admin,
          agencyId,
          `${stale.length} prospect${stale.length === 1 ? "" : "s"} na 7 dagen zonder reactie doorgezet`,
          "Automatisch naar 'geen reactie' verplaatst — een follow-up-DM sturen kan altijd nog, dan schuiven ze vanzelf terug zodra ze antwoorden.",
          "/platform/outreach"
        );
        if (sent) result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`outreach-hygiëne: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 2b. Nieuwe prospects kwalificeren (max 10 per run) ──────────
    // Zelfde check als /api/cron/qualify: geen high-ticket aanbod of
    // YouTube draait al top → afgekeurd. Toplaag slaan we over.
    try {
      const { data: unchecked } = await admin
        .from("prospects")
        .select("id, name, instagram, youtube, weakness, note")
        .eq("agency_id", agencyId)
        .eq("stage", "te_contacteren")
        .is("fit_checked_at", null)
        .or("tier.is.null,tier.neq.top")
        .limit(10);
      for (const p of unchecked ?? []) {
        const fit = await qualifyProspect(p);
        if (fit.verdict === "onbekend") continue; // storing → volgende run opnieuw
        const patch: Record<string, unknown> = { fit_reason: fit.reason, fit_checked_at: new Date().toISOString() };
        // Alleen zeker high-ticket blijft staan; twijfel = eruit (regel van Menno).
        if (fit.verdict !== "goed") { patch.stage = "afgekeurd"; patch.tier = null; }
        await admin.from("prospects").update(patch).eq("id", p.id);
      }
    } catch (e) {
      result.errors.push(`kwalificatie: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3d. Instagram aanvullen bij prospects met alleen YouTube ────
    // Zonder IG-handle kost een DM te veel uitzoekwerk; de handle staat
    // bijna altijd in de YouTube-kanaalbeschrijving. Max 25 per run.
    try {
      if (process.env.YOUTUBE_API_KEY) {
        const { data: missing } = await admin
          .from("prospects")
          .select("id, youtube")
          .eq("agency_id", agencyId)
          .eq("stage", "te_contacteren")
          // Ook "check IG"-achtige placeholders tellen als ontbrekend.
          .or("instagram.is.null,instagram.eq.,instagram.ilike.*check*ig*")
          .not("youtube", "is", null)
          .limit(25);
        let found = 0;
        for (const p of missing ?? []) {
          const ig = await findInstagramViaYoutube(String(p.youtube)).catch(() => null);
          if (ig) {
            await admin.from("prospects").update({ instagram: ig }).eq("id", p.id);
            found += 1;
          }
        }
        if (found) {
          const sent = await notifyOnce(
            admin,
            agencyId,
            `📸 ${found} Instagram-handle${found === 1 ? "" : "s"} automatisch gevonden`,
            "Uit de YouTube-kanaalbeschrijvingen gehaald en op de prospects gezet — de DM-knop werkt daar nu direct.",
            "/platform/outreach"
          );
          if (sent) result.notifications += 1;
        }
        result.igFilled = found;
      }
    } catch (e) {
      result.errors.push(`ig-aanvullen: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3c. Frame.io: nieuwe uploads → melding + koppelen aan kaart ─
    try {
      if (frameioConfigured()) {
        const { data: ag } = await admin
          .from("agencies")
          .select("frameio_project_id")
          .eq("id", agencyId)
          .maybeSingle();
        const projectId = ag?.frameio_project_id as string | null;
        if (projectId) {
          const files = await listProjectFiles(projectId);
          const { data: seenRows } = await admin
            .from("frameio_seen")
            .select("id")
            .in("id", files.map((f) => f.id));
          const seen = new Set((seenRows ?? []).map((r: { id: string }) => r.id));
          const fresh = files.filter((f) => !seen.has(f.id));

          if (fresh.length) {
            // Allereerste run: alles stil registreren, anders krijgt Menno
            // één melding per bestand dat er al maanden staat.
            const firstRun = seen.size === 0 && fresh.length === files.length && fresh.length > 3;
            await admin
              .from("frameio_seen")
              .upsert(fresh.map((f) => ({ id: f.id, name: f.name })), { onConflict: "id" });

            if (firstRun) {
              result.frameio = fresh.length;
            } else {
              // Kaarten om tegen te matchen (niet-gepost werk).
              const { data: cards } = await admin
                .from("content")
                .select("id, title, frame_url")
                .eq("agency_id", agencyId)
                .neq("stage", "posted");

              for (const f of fresh.slice(0, 10)) {
                const card = (cards ?? []).find((c: { title: string }) => matchesTitle(f.name, c.title));
                if (card && !card.frame_url) {
                  await admin.from("content").update({ frame_url: f.url }).eq("id", card.id);
                }
                await notifyOnce(
                  admin,
                  agencyId,
                  `🎬 Nieuwe video op Frame.io: ${f.name}`,
                  card
                    ? `Automatisch gekoppeld aan kaart "${card.title}" — de Frame-link staat erop.`
                    : "Nog niet aan een kaart gekoppeld — hang de link zelf aan de juiste kaart als dat nodig is.",
                  "/platform/pipeline"
                );
                result.notifications += 1;
                result.frameio = (result.frameio ?? 0) + 1;
              }
            }
          }
        }
      }
    } catch (e) {
      result.errors.push(`frameio: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3e. Follow-up-concepten: 7+ dagen stil → één zachte tweede DM ─
    try {
      const { data: quiet } = await admin
        .from("prospects")
        .select("id, name, instagram, youtube, weakness, note")
        .eq("agency_id", agencyId)
        .eq("stage", "geen_reactie")
        .is("last_reply_at", null)
        .is("reply_draft", null)
        .not("message", "is", null)
        .limit(5);
      let followups = 0;
      for (const p of quiet ?? []) {
        const { text, mock } = await generateText({
          template: FOLLOWUP_TEMPLATE,
          input: prospectDmContext(p),
          model: "fast",
        });
        if (mock) break;
        await admin.from("prospects").update({ reply_draft: text.trim() }).eq("id", p.id);
        followups += 1;
      }
      if (followups) {
        const sent = await notifyOnce(
          admin,
          agencyId,
          `↻ ${followups} follow-up${followups === 1 ? "" : "s"} klaargezet`,
          "Voor prospects die na een week nog stil zijn staat een zachte tweede DM klaar op de kaart — versturen blijft aan jou.",
          "/platform/outreach"
        );
        if (sent) result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`follow-ups: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3f. Einde van de maand: concepten die nog de deur uit moeten ─
    try {
      const dayOfMonth = new Date().getDate();
      if (dayOfMonth >= 24) {
        const drafts = await getMoneybirdDrafts();
        if (drafts.total > 0) {
          const sent = await notifyOnce(
            admin,
            agencyId,
            `💸 ${drafts.drafts.length} conceptfactu${drafts.drafts.length === 1 ? "ur" : "ren"} nog niet verstuurd (€${Math.round(drafts.total).toLocaleString("nl-NL")})`,
            "De maand loopt af — verstuur je concepten in Moneybird, anders telt deze omzet pas volgende maand mee.",
            "/platform/finance"
          );
          if (sent) result.notifications += 1;
        }
      }
    } catch (e) {
      result.errors.push(`concepten-signaal: ${e instanceof Error ? e.message : "onbekend"}`);
    }

    // ── 3g. Ochtendscan: verse video's uit volglijst + onderwerpen ─
    try {
      const scan = await runFeedScan(admin, agencyId);
      if (scan.added > 0) {
        const sent = await notifyOnce(
          admin,
          agencyId,
          `🎬 ${scan.added} nieuwe video${scan.added === 1 ? "" : "'s"} klaar om te checken`,
          "De ochtendscan vond outliers en knowledge in je volglijst — met samenvattingen. Zet je take eronder, dan wordt het scriptvoer.",
          "/platform/discover"
        );
        if (sent) result.notifications += 1;
      }
    } catch (e) {
      result.errors.push(`ochtendscan: ${e instanceof Error ? e.message : "onbekend"}`);
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/credit balance/i.test(msg)) {
          defects.push("Anthropic-tegoed is op — koop credits op platform.claude.com (Plans & Billing), dan draait alle AI direct");
        } else if (/invalid/i.test(msg)) {
          defects.push("ANTHROPIC_API_KEY is ongeldig — zet de key opnieuw in Vercel");
        } else {
          defects.push(`Anthropic-API weigert: ${msg.slice(0, 120)}`);
        }
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
      if (!frameioConfigured()) defects.push("FRAMEIO_CLIENT_ID/SECRET ontbreken — Frame.io-uploadmeldingen staan uit");

      result.selftest = defects;
      for (const d of defects) {
        const sent = await notifyOnce(admin, agencyId, `Zelftest: ${d.split(" — ")[0]}`, d, "/platform/settings");
        if (sent) result.notifications += 1;
        // Blijvende blokkades horen ook in Taken — zo blijven ze niet
        // eeuwig in de bel hangen maar staan ze op de lijst.
        await todoOnce(admin, agencyId, `🔧 ${d.split(" — ")[0]}`, "later").catch(() => undefined);
      }

      // Terugkerende verplichting: btw-aangifte in de kwartaalmaand
      // (jan/apr/jul/okt, deadline eind die maand). Eén taak per kwartaal.
      const nu = new Date();
      if ([0, 3, 6, 9].includes(nu.getMonth())) {
        const prevQ = nu.getMonth() === 0 ? 4 : nu.getMonth() / 3;
        const prevQYear = nu.getMonth() === 0 ? nu.getFullYear() - 1 : nu.getFullYear();
        const lastDay = new Date(nu.getFullYear(), nu.getMonth() + 1, 0).toISOString().slice(0, 10);
        await todoOnce(
          admin,
          agencyId,
          `💸 Btw-aangifte Q${prevQ} ${prevQYear} indienen (deadline eind ${nu.toLocaleDateString("nl-NL", { month: "long" })})`,
          "vandaag",
          lastDay
        ).catch(() => undefined);
      }
    } catch (e) {
      result.errors.push(`zelftest: ${e instanceof Error ? e.message : "onbekend"}`);
    }
  }

  return result;
}
