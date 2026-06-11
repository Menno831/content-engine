// ════════════════════════════════════════════════════════════════
// Gedeelde schrijflogica voor alle bronnen (Instagram, YouTube, …).
// Upsert content per (klant + external_id) en voegt een metric-snapshot
// toe met bron + tijdstempel. Eén plek, zodat elke bron identiek wegschrijft.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InstagramResult } from "@/lib/integrations/instagram";

export type SyncSource = "instagram_graph" | "instagram_scrape" | "youtube";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function persistMedia(
  admin: SupabaseClient,
  clientId: string,
  source: SyncSource,
  result: InstagramResult
): Promise<number> {
  let count = 0;
  for (const m of result.media) {
    const { data: existing } = await admin
      .from("content")
      .select("id")
      .eq("client_id", clientId)
      .eq("external_id", m.externalId)
      .maybeSingle();

    let contentId = existing?.id as string | undefined;
    if (!contentId) {
      const { data: inserted } = await admin
        .from("content")
        .insert({
          client_id: clientId,
          title: m.caption.slice(0, 80) || "(zonder bijschrift)",
          hook: m.caption.slice(0, 140),
          format: m.type,
          stage: "posted",
          source,
          external_id: m.externalId,
          permalink: m.permalink,
          published_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
        })
        .select("id")
        .single();
      contentId = inserted?.id as string | undefined;
    }
    if (!contentId) continue;

    await admin.from("content_metrics").insert({
      content_id: contentId,
      source,
      views: m.views,
      reach: m.reach,
      likes: m.likes,
      comments: m.comments,
      fetched_at: result.fetchedAt,
    });
    count++;
  }
  return count;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
