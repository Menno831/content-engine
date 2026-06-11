// ════════════════════════════════════════════════════════════════
// Brand voice intake: de vaste vragenlijst + AI-synthese die de
// antwoorden omzet in de vier branddocumenten (identity, story,
// strategy, voice). Gebruikt door het platform én de publieke
// intake-link die de klant zelf invult.
// ════════════════════════════════════════════════════════════════
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";

export { INTAKE_QUESTIONS };

export interface BrandDocsResult {
  identity: string;
  story: string;
  strategy: string;
  voice: string;
  mock: boolean;
}

function answersBlock(answers: Record<string, string>): string {
  return INTAKE_QUESTIONS.map((q) => {
    const a = (answers[q.key] ?? "").trim();
    return `VRAAG: ${q.label}\nANTWOORD: ${a || "(niet beantwoord)"}`;
  }).join("\n\n");
}

function parseSection(text: string, name: string): string {
  const re = new RegExp(`###\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n###\\s|$)`, "i");
  const m = text.match(re);
  return (m?.[1] ?? "").trim();
}

/**
 * Zet intake-antwoorden om in de vier branddocumenten via Claude.
 * Zonder API-key: geen synthese (we vervuilen de docs niet met mock-tekst).
 */
export async function synthesizeBrandDocs(
  clientName: string,
  handle: string,
  answers: Record<string, string>
): Promise<BrandDocsResult | null> {
  if (!isClaudeConfigured()) return null;

  const template = `Hieronder staan intake-antwoorden van ${clientName} (${handle || "geen handle"}), een founder waarvoor we Reels maken. Zet dit om in vier branddocumenten. Gebruik EXACT dit formaat met deze vier kopjes en niets eromheen:

### IDENTITY
Beknopte brand identity: kernwaarden, positionering, doelgroep. Max ~120 woorden.

### STORY
De brand story / origin: waar komt deze founder vandaan, keerpunt, welke transformatie bieden ze. Max ~150 woorden.

### STRATEGY
Content-strategie: 3 concrete content-pijlers (gebaseerd op hun meningen, verhaal en bewijs), funnel-opbouw (top/mid/bottom) en CTA-aanpak. Bullets.

### VOICE
De brand voice als INSTRUCTIE voor een AI-schrijver. Verplichte onderdelen:
- Toon & energie (gebaseerd op hoe deze persoon écht praat)
- Typische woorden/uitdrukkingen om te GEBRUIKEN (letterlijk uit de antwoorden)
- Woorden/stijl die VERBODEN zijn (letterlijk uit de antwoorden)
- Zinslengte en ritme
- 3 voorbeeldzinnen die exact zo klinken als deze persoon

Baseer alles strikt op de antwoorden — verzin geen feiten, cijfers of resultaten die er niet staan.

${answersBlock(answers)}`;

  const { text, mock } = await generateText({ template, input: clientName });
  if (mock) return null;

  const identity = parseSection(text, "IDENTITY");
  const story = parseSection(text, "STORY");
  const strategy = parseSection(text, "STRATEGY");
  const voice = parseSection(text, "VOICE");

  // Als de structuur niet te parsen is, zet alles in voice zodat niets verloren gaat.
  if (!voice && !identity) {
    return { identity: "", story: "", strategy: "", voice: text, mock: false };
  }
  return { identity, story, strategy, voice, mock: false };
}
