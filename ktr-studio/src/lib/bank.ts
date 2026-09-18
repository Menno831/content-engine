// ════════════════════════════════════════════════════════════════
// Bankgeschiedenis inlezen en sorteren. Moneybird heeft ABN en Revolut
// al gekoppeld, dus daar zit alles in. We halen een periode op en geven
// elke afschrijving een label:
//   vast   — abonnementen en vaste lasten (software, telefoon, bank)
//   klant  — editors en alles wat direct aan klantwerk hangt
//   prive  — boodschappen, uit eten, reizen zonder werk
//   overig — zakelijk maar geen van bovenstaande
// Regels eerst (snel en voorspelbaar), de rest door de AI.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMoneybirdMutationRange, type MoneybirdMutation } from "@/lib/integrations/moneybird";
import { generateText, isClaudeConfigured } from "@/lib/ai";

export interface BankImportResult {
  ok: boolean;
  fetched: number;
  labeled: number;
  byAi: number;
  /** Nog te sorteren na deze ronde — klik nog een keer. */
  remaining: number;
  error?: string;
}

// Eén ronde blijft binnen de tijd die een serverfunctie krijgt: de regels
// kosten niets, maar elke AI-batch is een API-call. Zes batches (±360
// afschrijvingen) is ruim binnen de limiet; de rest pak je met nog een klik.
const MAX_AI_BATCHES = 6;
const BATCH = 60;

const RULES: { kind: string; match: RegExp }[] = [
  {
    kind: "vast",
    match: /anthropic|claude|openai|vercel|supabase|google\s*(cloud|workspace|one)|adobe|frame\.?io|canva|notion|slack|figma|dropbox|elevenlabs|eleven labs|higgsfield|rapidapi|metricool|transkriptor|vidiq|wispr|snelstart|moneybird|vodafone|kpn|t-mobile|odido|ziggo|spotify|apple\.com|itunes|microsoft|github|cloudflare|namecheap|hostnet|transip|mollie|stripe|revolut\s*(ultra|premium|plan)|irltoolkit|irl toolkit|skool|whop/i,
  },
  { kind: "klant", match: /dualz|editor|edit|nguyen|khedri|belaran|fiverr|upwork|videograaf/i },
  {
    kind: "prive",
    match: /albert heijn|jumbo|lidl|aldi|plus supermarkt|uber\s*eats|thuisbezorgd|deliveroo|dominos|mcdonald|starbucks|hema|action|zara|h&m|decathlon|bol\.com|coolblue|primark|douglas|kruidvat|etos|apotheek|huisarts|tandarts|sportschool|basic.?fit|barbers|kapper|tikkie|roparun|ticketswap|nike|adidas|gall|slijterij/i,
  },
  { kind: "overig", match: /easypark|parkeren|q-park|ns\.nl|ns groep|shell|bp |esso|tankstation|holafly|airbnb|booking\.com|transavia|klm|ryanair|sixt|hertz|europcar|belastingdienst|kvk|verzekering/i },
];

function byRule(m: MoneybirdMutation): string | null {
  const hay = `${m.party} ${m.description}`;
  for (const r of RULES) if (r.match.test(hay)) return r.kind;
  return null;
}

const PROMPT = `Je sorteert bankafschrijvingen van een Nederlands content-agency (video voor founders).
Geef per afschrijving één label:
- "vast": abonnement of vaste maandlast (software, telefoon, hosting, bankkosten)
- "klant": editors, freelancers, of kosten die direct aan klantwerk hangen
- "prive": boodschappen, uit eten, kleding, sport, privé-reizen
- "overig": zakelijk maar geen van bovenstaande (parkeren, reizen voor werk, belasting, verzekering)

Antwoord met alleen een JSON-array, niets eromheen:
[{"id":"…","kind":"vast"}, …]`;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function byAiBatch(items: MoneybirdMutation[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!items.length || !isClaudeConfigured()) return out;
  const input = items
    .map((m) => `id=${m.id} · €${Math.abs(m.amount).toFixed(2)} · ${m.party}${m.description ? ` · ${m.description}` : ""}`)
    .join("\n");
  const { text, mock } = await generateText({ template: PROMPT, input: `AFSCHRIJVINGEN\n\n${input}`, model: "fast" });
  if (mock) return out;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return out;
  try {
    for (const row of JSON.parse(match[0]) as any[]) {
      const kind = String(row.kind ?? "");
      if (["vast", "klant", "prive", "overig"].includes(kind)) out.set(String(row.id), kind);
    }
  } catch {
    return out;
  }
  return out;
}

/** Haalt de bankgeschiedenis op en labelt alles wat nog geen label heeft. */
export async function importBankHistory(
  db: SupabaseClient,
  agencyId: string,
  fromDate: string,
  toDate: string
): Promise<BankImportResult> {
  const res = await getMoneybirdMutationRange(fromDate, toDate);
  if (!res.configured) return { ok: false, fetched: 0, labeled: 0, byAi: 0, remaining: 0, error: "Moneybird is niet gekoppeld." };
  const spend = res.mutations.filter((m) => m.amount < 0);
  if (!spend.length) return { ok: true, fetched: 0, labeled: 0, byAi: 0, remaining: 0, error: res.error };

  // Wat al een label heeft laten we met rust — jouw keuze wint.
  const { data: known } = await db.from("expense_links").select("id").in("id", spend.map((m) => m.id));
  const seen = new Set((known ?? []).map((k) => String(k.id)));
  const todo = spend.filter((m) => !seen.has(m.id));

  const rows: Record<string, unknown>[] = [];
  const unknown: MoneybirdMutation[] = [];
  for (const m of todo) {
    const kind = byRule(m);
    if (kind) rows.push({ id: m.id, agency_id: agencyId, kind, label: m.party.slice(0, 80), amount: m.amount, mutation_date: m.date, client_id: null });
    else unknown.push(m);
  }

  // De rest aan de AI voorleggen, maar niet meer dan één ronde aankan.
  let byAi = 0;
  const aiTodo = unknown.slice(0, MAX_AI_BATCHES * BATCH);
  const remaining = unknown.length - aiTodo.length;
  for (let i = 0; i < aiTodo.length; i += BATCH) {
    const chunk = aiTodo.slice(i, i + BATCH);
    const verdict = await byAiBatch(chunk).catch(() => new Map<string, string>());
    for (const m of chunk) {
      const kind = verdict.get(m.id);
      if (!kind) continue;
      rows.push({ id: m.id, agency_id: agencyId, kind, label: m.party.slice(0, 80), amount: m.amount, mutation_date: m.date, client_id: null });
      byAi += 1;
    }
  }

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("expense_links").upsert(rows.slice(i, i + 200));
    if (error) return { ok: false, fetched: spend.length, labeled: i, byAi, remaining, error: error.message };
  }

  return { ok: true, fetched: spend.length, labeled: rows.length, byAi, remaining, error: res.error };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
