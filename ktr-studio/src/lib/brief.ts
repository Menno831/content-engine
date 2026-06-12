// ════════════════════════════════════════════════════════════════
// Daily Brief: genereer per klant een paar kant-en-klare content-
// ideeën (hook + invalshoek + waarom het werkt), op basis van brand
// voice/strategie + second brain. Gedeeld door de cron én de
// handmatige "Genereer nu"-knop. Idempotent per (klant, dag).
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, isClaudeConfigured } from "@/lib/ai";

interface BriefIdea {
  title: string;
  angle: string;
  hook: string;
  why: string;
}

function parseIdeas(text: string): BriefIdea[] {
  return text
    .split(/###\s*IDEE/i)
    .map((block) => ({
      title: block.match(/TITEL:\s*(.+)/i)?.[1]?.trim() ?? "",
      angle: block.match(/INVALSHOEK:\s*(.+)/i)?.[1]?.trim() ?? "",
      hook: block.match(/HOOK:\s*(.+)/i)?.[1]?.trim() ?? "",
      why: block.match(/WAAROM:\s*(.+)/i)?.[1]?.trim() ?? "",
    }))
    .filter((i) => i.title && i.hook)
    .slice(0, 5);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Genereer + bewaar de brief voor één klant voor vandaag. Slaat over
// als er voor vandaag al ideeën staan (tenzij force). Geeft het aantal
// nieuw aangemaakte ideeën terug.
export async function generateBriefForClient(
  admin: SupabaseClient,
  agencyId: string,
  clientId: string,
  opts: { force?: boolean; count?: number } = {}
): Promise<{ created: number; skipped?: boolean; error?: string }> {
  if (!isClaudeConfigured()) return { created: 0, error: "geen_key" };

  const today = new Date().toISOString().slice(0, 10);

  if (!opts.force) {
    const { count } = await admin
      .from("brief_ideas")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("brief_date", today);
    if ((count ?? 0) > 0) return { created: 0, skipped: true };
  }

  // Klantcontext ophalen.
  const { data: c } = await admin
    .from("clients")
    .select("name, ig_handle, brand_voice, brand_identity, brand_strategy")
    .eq("id", clientId)
    .maybeSingle();
  if (!c) return { created: 0, error: "onbekende klant" };

  // Recente winnende competitor-outliers als extra inspiratie (titels).
  const { data: outliers } = await admin
    .from("competitor_posts")
    .select("caption, views")
    .eq("agency_id", agencyId)
    .order("views", { ascending: false })
    .limit(8);

  // Wat hebben we deze klant recent al laten maken? (niet herhalen)
  const { data: recent } = await admin
    .from("content")
    .select("title")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(15);

  const ctxParts = [
    c.brand_voice ? `Brand voice (volg strikt): ${c.brand_voice}` : null,
    c.brand_identity ? `Identity: ${c.brand_identity}` : null,
    c.brand_strategy ? `Strategie/pijlers: ${c.brand_strategy}` : null,
    outliers?.length ? `Wat werkt nu in de niche (ter inspiratie, niet kopiëren):\n${outliers.map((o: any) => `- ${String(o.caption ?? "").slice(0, 120)}`).join("\n")}` : null,
    recent?.length ? `Recent al gemaakt (NIET herhalen):\n${recent.map((r: any) => `- ${r.title}`).join("\n")}` : null,
  ].filter(Boolean);

  const n = opts.count ?? 3;
  const template = `Je bent de contentstrateeg van ${c.name} (${c.ig_handle ?? ""}). Geef ${n} verse, kant-en-klare content-ideeën voor vandaag — scherp, concreet, en beter dan de voor de hand liggende variant.

${ctxParts.join("\n\n")}

Output EXACT in dit formaat per idee, niets eromheen:
### IDEE
TITEL: korte werktitel
INVALSHOEK: de niche/invalshoek in 1 zin
HOOK: de letterlijke openingszin (scroll-stopper, geen aanhalingstekens)
WAAROM: waarom dit beter werkt dan het voor de hand liggende (1 zin)`;

  let text: string;
  try {
    const out = await generateText({ template, input: c.name, model: "smart" });
    if (out.mock) return { created: 0, error: "geen_key" };
    text = out.text;
  } catch (e) {
    return { created: 0, error: e instanceof Error ? e.message : "fout" };
  }

  const ideas = parseIdeas(text);
  if (ideas.length === 0) return { created: 0, error: "geen_ideeen" };

  let created = 0;
  for (const idea of ideas) {
    const { error } = await admin.from("brief_ideas").insert({
      agency_id: agencyId,
      client_id: clientId,
      brief_date: today,
      title: idea.title.slice(0, 120),
      angle: idea.angle || null,
      hook: idea.hook || null,
      why: idea.why || null,
    });
    if (!error) created++;
    // Dubbele titel op dezelfde dag -> uniek-index blokkeert; gewoon overslaan.
  }
  return { created };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
