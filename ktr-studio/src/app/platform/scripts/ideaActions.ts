"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/guard";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { scriptSkeleton } from "@/lib/ideas-shared";

export interface IdeaResult {
  ok?: boolean;
  error?: string;
  message?: string;
  scriptId?: string;
}

export async function setIdeaStatusAction(ideaId: string, status: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("content_ideas").update({ status }).eq("id", ideaId);
  if (error) return { error: error.message };
  revalidatePath("/platform/scripts");
  return { ok: true };
}

export async function deleteIdeaAction(ideaId: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("content_ideas").delete().eq("id", ideaId);
  if (error) return { error: error.message };
  revalidatePath("/platform/scripts");
  return { ok: true };
}

// ── Wat er écht van Menno bekend is ─────────────────────────────
// Alleen dingen die hij zelf heeft gezegd in zijn calls. Het model mag
// hier uit putten, maar niets verzinnen wat hier niet staat.
export const MENNO_FEITEN = `ACHTERGROND (uit zijn eigen calls, allemaal waar)
- Had vier jaar geleden een schoonmaakbedrijf, ongeveer 1000 euro per week.
- Wilde het vak leren en betaalde een lokaal marketingbureau om er te mogen zijn.
  Een uur rijden, elke week, een half jaar lang.
- Begon met videografie op een geleende camera van een vriend van school. Eerst
  gratis, toen 50 euro per uur, uiteindelijk 750 euro per dag.
- Zag dat videografie niet verder schaalt, huurde editors in en bouwde het om tot
  een agency. Nu rond de tien editors, uit Nederland, Vietnam, Pakistan, India en
  Zuid-Afrika. Eén vaste editor doet alleen zijn eigen content.
- Aanbod nu: YouTube-groei voor founders, 4000 euro per maand. Ideale klant: een
  founder die meer dan 20k per maand winst draait, al content maakt en YouTube
  laat liggen. Vooral e-commerce-coaches.
- Bij één klant ging het van 12.500 naar 80.000 euro per maand in zeven maanden.
  Die case mag hij niet publiek delen, dat vindt hij zonde.
- Zijn eigen omzet schommelt tussen 8k en 25k per maand omdat alles via referrals
  komt. Hij wil naar 50k en daarom een personal brand.
- Hij werkt nu ongeveer drie uur per dag en wil er acht tot tien. Niet uit moeten,
  maar omdat hij iets wil bouwen voor zijn familie.
- Heeft nog nooit een klant uit een Instagram-DM gehaald. Klanten komen uit
  referrals, YouTube en oude contacten.
- Reist veel en filmt onderweg: Mexico (Cancún, Isla Mujeres, Tulum), Marbella,
  Cyprus, Boedapest, Estland. Zijn vriendin filmt hem.
- Betaalt zelf 5000 pond voor vier maanden coaching bij Seth aan zijn merk.
- Maakte twaalf jaar geleden al YouTube-video's over deep web-dingen, nu unlisted.

STEM
- Spreektaal, korte zinnen, zoals hij praat. Geen marketingwoorden, geen "in deze
  video". Nederlands, af en toe een Engels woord dat hij zelf ook gebruikt.
- Koud openen. Eerste zin is de hook, geen aanloop.
- Eén concreet detail per video: een bedrag, een datum, een plek. Niet drie.
- Hij is geen expert die het weet, hij is iemand die het aan het bouwen is en
  hardop meedenkt. Twijfel mag erin.`;

const SCRIPT_PROMPT = `Je schrijft een kant-en-klaar script voor Menno Kater dat hij morgen kan opnemen.

{{onderwerp}}

Schrijf het script uit in het Nederlands, in zijn stem, in deze vorm — en schrijf
élke regel alsof hij het zo inspreekt, dus geen aanwijzingen maar echte zinnen:

HOOK (0-3 sec)
<één zin, koud, de hook uit het idee mag je aanscherpen>

CONTEXT (3-15 sec)
<twee tot vier zinnen waarom hij dit zegt, met één concreet detail uit zijn verhaal>

CHANGE (15-45 sec)
<de kern: wat er veranderde of wat de kijker anders moet doen. Één punt, concreet.>

CLOSE (laatste 5 sec)
<één zin, hard afkappen. Geen outro, geen "abonneer".>

BEELD
- Opening: <wat je ziet in de eerste seconde>
- B-roll: <twee of drie shots die hij echt kan hebben>
- Op het scherm: <de tekst die in beeld staat>

Regels: gebruik alleen cijfers, plekken en gebeurtenissen die hierboven staan.
Verzin niets bij. Geen kopjes of uitleg buiten het format hierboven.`;

async function voorbeeldScript(idea: {
  title: string;
  hook?: string | null;
  angle?: string | null;
  pillar?: string | null;
  format?: string | null;
}): Promise<string | null> {
  if (!isClaudeConfigured()) return null;
  const input = [
    `IDEE: ${idea.title}`,
    idea.hook ? `HOOK UIT HET IDEE: ${idea.hook}` : null,
    idea.angle ? `WAT ERIN MOET: ${idea.angle}` : null,
    idea.pillar ? `PIJLER: ${idea.pillar}` : null,
    idea.format ? `FORMAT: ${idea.format}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const { text, mock } = await generateText({
    template: SCRIPT_PROMPT.replace("{{onderwerp}}", MENNO_FEITEN),
    input,
    model: "smart",
  });
  if (mock || !text.trim()) return null;
  return text.trim();
}

/** Idee → script: een uitgeschreven voorbeeld plus de structuur eronder. */
export async function ideaToScriptAction(ideaId: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };

  const { data: idea, error: readErr } = await auth.supabase
    .from("content_ideas")
    .select("id,title,hook,angle,pillar,format,client_id,script_id")
    .eq("id", ideaId)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!idea) return { error: "Idee niet gevonden." };
  if (idea.script_id) return { ok: true, scriptId: idea.script_id as string, message: "Er stond al een script bij dit idee." };

  const { data: script, error } = await auth.supabase
    .from("scripts")
    .insert({
      agency_id: auth.agency.id,
      client_id: idea.client_id,
      title: idea.title,
      content: await scriptBody(idea),
      status: "to_write",
      tag: idea.pillar ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await auth.supabase
    .from("content_ideas")
    .update({ status: "gemaakt", script_id: script.id })
    .eq("id", ideaId);

  revalidatePath("/platform/scripts");
  return { ok: true, scriptId: script.id as string, message: "Script aangemaakt — met een uitgeschreven voorbeeld bovenaan." };
}

// Het voorbeeld bovenaan (dat lees je als eerste), de structuur eronder als
// maatlat. Geen AI beschikbaar? Dan alleen de structuur, zoals eerst.
async function scriptBody(idea: {
  title: string;
  hook?: string | null;
  angle?: string | null;
  pillar?: string | null;
  format?: string | null;
}): Promise<string> {
  const voorbeeld = await voorbeeldScript(idea).catch(() => null);
  if (!voorbeeld) return scriptSkeleton(idea);
  return `VOORBEELD — zo zou ik 'm maken
Uitgeschreven uit je eigen verhaal. Gooi eruit wat niet klopt.

${voorbeeld}

════════════════════════════════════════
DE STRUCTUUR (waar je op let)

${scriptSkeleton(idea)}`;
}

// ── Nieuwe ideeën uit je eigen bronnen ──────────────────────────
const IDEEEN_PROMPT = `Je bent de contentstrateeg van Menno Kater. Je kent zijn merk:

- Positionering: "visionary operator" — geen videograaf maar operator die groei bouwt.
- Persoonlijke missie: van passief verdienen (±20k/mnd, weinig werken) naar actief
  bouwen aan generationele welvaart voor zijn familie. Hij wil juist MEER werken.
- Drie pijlers: Value (wat hij weet over YouTube/content/groei), Documentation (waar
  hij nu mee bezig is, achter de schermen), Lifestyle (reizen, vrijheid, het leven).
- Stijl: rauw boven gepolijst. Koud openen, geen intro. Eén concreet detail (bedrag,
  datum, plek) in plaats van vage claims. Persoonlijk verhaal boven generieke tips.
- Alles wat hij post hoort bij één doorlopend verhaal, als seizoenen van een serie.

Hieronder staan fragmenten uit zijn echte calls en gesprekken. Haal daar content-ideeën
uit. Regels:
- Alleen ideeën die je kunt onderbouwen met iets wat er letterlijk staat. Verzin geen
  cijfers, plekken of gebeurtenissen.
- Elk idee moet iets van hem persoonlijk bevatten — een moment, een getal, een twijfel.
  Generieke tips zijn waardeloos.
- De hook is een letterlijk bruikbare openingszin, geen omschrijving.
- Varieer over de drie pijlers en over formats (Reel, Carrousel, Longform, Story).

Antwoord met alleen een JSON-array, niets eromheen. Per idee:
{"title": "korte werktitel",
 "hook": "de letterlijke openingszin",
 "angle": "in 1-2 zinnen: wat erin moet en waarom dit werkt voor hem",
 "pillar": "Value" | "Documentation" | "Lifestyle",
 "format": "Reel" | "Carrousel" | "Longform" | "Story",
 "source_note": "waar dit vandaan komt, bv. 'call met Seth 15 sep — Tulum-carrousel'"}

Geef er 8 tot 12.`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateIdeasAction(): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!isClaudeConfigured()) return { error: "ANTHROPIC_API_KEY ontbreekt — zet 'm in Vercel." };

  const { data: sources, error: srcErr } = await auth.supabase
    .from("idea_sources")
    .select("id,title,happened_on,content")
    .order("happened_on", { ascending: false })
    .limit(12);
  if (srcErr) return { error: srcErr.message };
  if (!sources?.length) {
    return { error: "Nog geen bronnen. Voeg eerst een call of gesprek toe onder Bronnen." };
  }

  // Wat er al ligt niet nog eens voorstellen.
  const { data: existing } = await auth.supabase.from("content_ideas").select("title").limit(200);
  const known = (existing ?? []).map((r: any) => r.title).join(" · ");

  const input = [
    ...sources.map((s: any) => `── ${s.title}${s.happened_on ? ` (${String(s.happened_on).slice(0, 10)})` : ""}\n${s.content}`),
    known ? `\n\nBESTAANDE IDEEËN (niet herhalen):\n${known}` : "",
  ].join("\n\n");

  const { text, mock } = await generateText({ template: IDEEEN_PROMPT, input, model: "smart" });
  if (mock) return { error: "AI gaf geen antwoord — controleer ANTHROPIC_API_KEY en het tegoed." };

  // De JSON uit het antwoord vissen; een model zet er soms tekst omheen.
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { error: "Kon het antwoord niet lezen — probeer het nog eens." };

  let parsed: any[];
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { error: "Kon het antwoord niet lezen — probeer het nog eens." };
  }

  const sourceByTitle = new Map(sources.map((s: any) => [String(s.title).toLowerCase(), s.id]));
  const rows = parsed
    .filter((p) => p && typeof p.title === "string" && p.title.trim())
    .slice(0, 15)
    .map((p) => {
      // Bron koppelen als het model een herkenbare titel noemt.
      const note = String(p.source_note ?? "").toLowerCase();
      let sourceId: string | null = null;
      for (const [title, id] of sourceByTitle) {
        if (note.includes(title.slice(0, 18))) {
          sourceId = id as string;
          break;
        }
      }
      return {
        agency_id: auth.agency.id,
        title: String(p.title).trim().slice(0, 160),
        hook: p.hook ? String(p.hook).trim().slice(0, 400) : null,
        angle: p.angle ? String(p.angle).trim().slice(0, 800) : null,
        pillar: ["Value", "Documentation", "Lifestyle"].includes(p.pillar) ? p.pillar : null,
        format: ["Reel", "Carrousel", "Longform", "Story"].includes(p.format) ? p.format : null,
        source_note: p.source_note ? String(p.source_note).trim().slice(0, 200) : null,
        source_id: sourceId,
        status: "nieuw",
      };
    });

  if (!rows.length) return { error: "Geen bruikbare ideeën teruggekregen." };

  const { error } = await auth.supabase.from("content_ideas").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: true, message: `${rows.length} nieuwe ideeën uit je calls.` };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function addSourceAction(input: {
  title: string;
  kind: string;
  happenedOn: string;
  url: string;
  content: string;
}): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!input.title.trim()) return { error: "Geef de bron een titel." };
  if (input.content.trim().length < 50) return { error: "Plak wat meer tekst — hier valt nu niks uit te halen." };

  const { error } = await auth.supabase.from("idea_sources").insert({
    agency_id: auth.agency.id,
    kind: input.kind || "call",
    title: input.title.trim(),
    happened_on: input.happenedOn || null,
    url: input.url.trim() || null,
    content: input.content.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: true, message: "Bron toegevoegd." };
}
