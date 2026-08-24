// ════════════════════════════════════════════════════════════════
// Claude API-koppeling (server-only). Voedt Prompts + Studio.
// Geen ANTHROPIC_API_KEY -> nette mock, zodat de UI altijd werkt.
//
// Twee modellen, bewust gekozen op kosten/kwaliteit:
//  - SMART (Opus 4.8): brand voice-synthese — het belangrijkste, mag duur.
//  - FAST  (Haiku 4.5): hooks, scripts, losse generaties — ~5x goedkoper.
// ════════════════════════════════════════════════════════════════
import Anthropic from "@anthropic-ai/sdk";

// Actuele API-model-ID's (aug 2026): Opus 5 voor het zware werk,
// Haiku 4.5 (met datumsuffix, zoals de API 'm verwacht) voor snel werk.
const MODEL_SMART = "claude-opus-5";
const MODEL_FAST = "claude-haiku-4-5-20251001";

export type AiModel = "smart" | "fast";

// Stabiel systeemprompt -> wordt gecachet (prefix-match) over alle calls.
const SYSTEM_PROMPT = `Je bent de AI-contentassistent van KTR Studio, een content agency dat Reels-systemen bouwt voor founders.
Schrijf in het Nederlands met een directe, energieke founder-naar-founder toon. Geen wollige taal, geen clichés, geen disclaimers.
Lever concreet, klaar-om-te-gebruiken resultaat — precies wat gevraagd wordt, zonder meta-uitleg vooraf of achteraf.`;

export const isClaudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export interface GenerateInput {
  template: string; // prompt-template (mag {{onderwerp}} bevatten)
  input: string; // gebruikersinput / onderwerp
  model?: AiModel; // "smart" (Opus, default) of "fast" (Haiku)
}

function fillTemplate(template: string, input: string): string {
  if (template.includes("{{onderwerp}}")) {
    return template.split("{{onderwerp}}").join(input || "(geen onderwerp opgegeven)");
  }
  return input ? `${template}\n\nOnderwerp / context: ${input}` : template;
}

function mockOutput(input: string): string {
  return `(Voorbeeldoutput — koppel je Claude API-key om echt te genereren.)\n\nOnderwerp: ${
    input || "—"
  }\n\n1. Iedereen post elke dag — en niemand groeit. Dit is waarom.\n2. Je hook is niet het probleem. Je eerste frame wel.\n3. Stop met 'waarde geven'. Doe dit in plaats daarvan.`;
}

export async function generateText({ template, input, model = "smart" }: GenerateInput): Promise<{ text: string; mock: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { text: mockOutput(input), mock: true };
  }

  const client = new Anthropic();
  const filled = fillTemplate(template, input);

  // Opus krijgt adaptief denken + effort; Haiku ondersteunt die parameters
  // niet (zou 400'en) en draait dus plain — precies wat je wil voor snelle,
  // goedkope generaties zoals hooks en scripts.
  const isSmart = model === "smart";
  const base = {
    model: isSmart ? MODEL_SMART : MODEL_FAST,
    max_tokens: 4000,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: filled }],
  };

  // Trapsgewijs: eerst de volle Opus-call, bij een API-weigering
  // (bv. onbekende parameter of model niet beschikbaar op deze key)
  // terugvallen op een kale call en daarna op het snelle model —
  // liever een iets simpeler antwoord dan een kapotte pagina.
  let response;
  try {
    response = await client.messages.create(
      isSmart
        ? { ...base, thinking: { type: "adaptive" }, output_config: { effort: "medium" } }
        : base
    );
  } catch (e1) {
    if (!isSmart) throw e1;
    try {
      response = await client.messages.create(base);
    } catch {
      response = await client.messages.create({ ...base, model: MODEL_FAST });
    }
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text: text || "(geen output)", mock: false };
}
