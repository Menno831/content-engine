// ════════════════════════════════════════════════════════════════
// Claude API-koppeling (server-only). Voedt Prompts + Studio.
// Geen ANTHROPIC_API_KEY -> nette mock, zodat de UI altijd werkt.
// ════════════════════════════════════════════════════════════════
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

// Stabiel systeemprompt -> wordt gecachet (prefix-match) over alle calls.
const SYSTEM_PROMPT = `Je bent de AI-contentassistent van KTR Studio, een content agency dat Reels-systemen bouwt voor founders.
Schrijf in het Nederlands met een directe, energieke founder-naar-founder toon. Geen wollige taal, geen clichés, geen disclaimers.
Lever concreet, klaar-om-te-gebruiken resultaat — precies wat gevraagd wordt, zonder meta-uitleg vooraf of achteraf.`;

export const isClaudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export interface GenerateInput {
  template: string; // prompt-template (mag {{onderwerp}} bevatten)
  input: string; // gebruikersinput / onderwerp
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

export async function generateText({ template, input }: GenerateInput): Promise<{ text: string; mock: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { text: mockOutput(input), mock: true };
  }

  const client = new Anthropic();
  const filled = fillTemplate(template, input);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: filled }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text: text || "(geen output)", mock: false };
}
