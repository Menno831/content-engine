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

export interface TranscriptInput {
  title: string;
  content: string;
}

// Ruwe spraak is de beste voice-bron, maar we bewaken de contextgrootte:
// max ~15k tekens per transcript, ~60k totaal (nieuwste eerst).
function transcriptsBlock(transcripts: TranscriptInput[]): string {
  const MAX_PER = 15_000;
  const MAX_TOTAL = 60_000;
  let total = 0;
  const parts: string[] = [];
  for (const t of transcripts) {
    if (total >= MAX_TOTAL) break;
    const chunk = t.content.slice(0, Math.min(MAX_PER, MAX_TOTAL - total));
    total += chunk.length;
    parts.push(`--- TRANSCRIPT: ${t.title} ---\n${chunk}`);
  }
  return parts.join("\n\n");
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
  answers: Record<string, string>,
  transcripts: TranscriptInput[] = []
): Promise<BrandDocsResult | null> {
  if (!isClaudeConfigured()) return null;

  const hasAnswers = Object.values(answers).some((a) => (a ?? "").trim());

  const sources = [
    hasAnswers ? `INTAKE-ANTWOORDEN:\n\n${answersBlock(answers)}` : null,
    transcripts.length
      ? `TRANSCRIPTEN — ruwe spraak. Dit is de BELANGRIJKSTE bron voor de VOICE: zo praat ${clientName} écht. Let op: een transcript kan meerdere sprekers bevatten (interviews, podcasts, calls). Identificeer eerst wie ${clientName} is (de spreker over wie de intake gaat / die het meest vanuit de ik-vorm over dit vak praat) en baseer de voice UITSLUITEND op de uitspraken van die spreker. Negeer interviewers en gasten volledig.\n\n${transcriptsBlock(transcripts)}`
      : null,
  ].filter(Boolean);

  const template = `Hieronder staat bronmateriaal van ${clientName} (${handle || "geen handle"}), een founder waarvoor we Reels maken. Zet dit om in vier branddocumenten. Gebruik EXACT dit formaat met deze vier kopjes en niets eromheen:

### IDENTITY
Beknopte brand identity: kernwaarden, positionering, doelgroep. Max ~120 woorden.

### STORY
De brand story / origin: waar komt deze founder vandaan, keerpunt, welke transformatie bieden ze. Max ~150 woorden.

### STRATEGY
Content-strategie: 3 concrete content-pijlers (gebaseerd op hun meningen, verhaal en bewijs), funnel-opbouw (top/mid/bottom) en CTA-aanpak. Bullets.

### VOICE
De brand voice als INSTRUCTIE voor een AI-schrijver. Verplichte onderdelen:
- Toon & energie (gebaseerd op hoe deze persoon écht praat)
- Typische woorden/uitdrukkingen om te GEBRUIKEN (letterlijk uit het bronmateriaal — citeer ze)
- Woorden/stijl die VERBODEN zijn
- Zinslengte en ritme (observeer dit in de transcripten als die er zijn)
- 5 voorbeeldzinnen die exact zo klinken als deze persoon (bij voorkeur licht bewerkte échte uitspraken uit de transcripten)

Baseer alles strikt op het bronmateriaal — verzin geen feiten, cijfers of resultaten die er niet staan.

${sources.join("\n\n══════════════\n\n")}`;

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
