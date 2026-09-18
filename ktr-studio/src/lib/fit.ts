// ════════════════════════════════════════════════════════════════
// Past een competitor-post bij Menno's strategie? Eén AI-oordeel per
// post, opgeslagen zodat een pagina-refresh niks kost. Gebruikt door
// de knop op Discover én door de cron na elke competitor-sync.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, isClaudeConfigured } from "@/lib/ai";

// Wat "past bij Menno" betekent — uit de calls met Seth, kort en scherp.
export const MENNO_STRATEGY = `Menno Kater, "visionary operator": bouwt YouTube- en Reels-systemen voor
founders en coaches, en documenteert zijn eigen groei. Missie: van passief verdienen
naar actief bouwen aan generationele welvaart voor zijn familie.

Pijlers: Value (YouTube-groei, content als omzetmotor, systemen, editors, schalen),
Documentation (achter de schermen van zijn agency, reizen, bouwen, cijfers),
Lifestyle (vrijheid, familie, reizen — altijd met een reden erachter).

Stijl: rauw boven gepolijst, koud openen, één concreet detail, persoonlijk verhaal
boven generieke tips, elke post is een aflevering van één doorlopend verhaal.

PAST: content over YouTube/short-form-groei voor ondernemers, agency-operaties,
founder-verhalen met echte cijfers, reizen-met-werk, familie-als-drijfveer, systemen
en editors, eerlijke lessen over geld en werk.
PAST NIET: dating/relaties, fitness als hoofdonderwerp, crypto/trading-signalen,
dropshipping-hypes, algemene motivatie zonder verhaal, entertainment zonder les,
alles wat Menno niet zelf zou kunnen meemaken of onderbouwen.`;

const PROMPT = `Je beoordeelt of posts van andere accounts passen bij de strategie hieronder.
Per post: past het (ja/nee), waarom in één zin, en als het past: hoe Menno dit in zijn
eigen wereld zou maken — één zin, met zijn eigen context (agency, editors, YouTube,
reizen, familie), niet een kopie van de post.

STRATEGIE
{{onderwerp}}

Antwoord met alleen een JSON-array, niets eromheen:
[{"id":"…","fit":true,"reason":"…","angle":"…"}, …]
Bij fit=false mag angle leeg zijn. Wees streng: twijfel is nee.`;

export interface FitResult {
  scored: number;
  error?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Beoordeelt nog niet beoordeelde posts (max `limit`), agency-breed. */
export async function scoreUncheckedPosts(db: SupabaseClient, limit = 40): Promise<FitResult> {
  if (!isClaudeConfigured()) return { scored: 0, error: "ANTHROPIC_API_KEY ontbreekt" };

  const { data: posts, error } = await db
    .from("competitor_posts")
    .select("id,caption,format,views")
    .is("fit_checked_at", null)
    .order("views", { ascending: false })
    .limit(limit);
  if (error) return { scored: 0, error: error.message };
  if (!posts?.length) return { scored: 0 };

  const input = posts
    .map((p: any) => `id=${p.id} · ${p.format ?? "post"} · ${Number(p.views ?? 0)} views\n${String(p.caption ?? "").slice(0, 400) || "(geen bijschrift)"}`)
    .join("\n\n");

  const { text, mock } = await generateText({
    template: PROMPT.replace("{{onderwerp}}", MENNO_STRATEGY),
    input: `POSTS\n\n${input}`,
    model: "fast",
  });
  if (mock) return { scored: 0, error: "AI gaf geen antwoord" };

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { scored: 0, error: "antwoord onleesbaar" };
  let parsed: any[];
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { scored: 0, error: "antwoord onleesbaar" };
  }

  const now = new Date().toISOString();
  const known = new Set(posts.map((p: any) => p.id));
  let scored = 0;
  for (const r of parsed) {
    if (!r || !known.has(r.id)) continue;
    const { error: upErr } = await db
      .from("competitor_posts")
      .update({
        fit: Boolean(r.fit),
        fit_reason: r.reason ? String(r.reason).slice(0, 300) : null,
        fit_angle: r.fit && r.angle ? String(r.angle).slice(0, 400) : null,
        fit_checked_at: now,
      })
      .eq("id", r.id);
    if (!upErr) scored++;
  }
  // Posts die het model oversloeg toch afvinken — anders blijven ze elke
  // run terugkomen. Zonder oordeel = niet tonen (fit null blijft verborgen).
  const seen = new Set(parsed.map((r: any) => r?.id));
  const skipped = posts.filter((p: any) => !seen.has(p.id)).map((p: any) => p.id);
  if (skipped.length) await db.from("competitor_posts").update({ fit_checked_at: now }).in("id", skipped);

  return { scored };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
