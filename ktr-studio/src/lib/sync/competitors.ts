// ════════════════════════════════════════════════════════════════
// Competitor-sync (kern): posts van een gevolgd account ophalen via
// de Instagram-scraper en upserten. Gedeeld door de handmatige
// ↻-knop (Discover) en de automatische cron.
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInstagram } from "@/lib/integrations/instagram";

export interface CompetitorSyncResult {
  ok: boolean;
  items?: number;
  error?: string;
}

export async function syncCompetitorCore(competitorId: string): Promise<CompetitorSyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "geen_serverkey" };

  const { data: comp } = await admin
    .from("competitors")
    .select("id, handle, agency_id")
    .eq("id", competitorId)
    .maybeSingle();
  if (!comp) return { ok: false, error: "onbekende competitor" };

  try {
    const result = await fetchInstagram(comp.handle as string);
    for (const m of result.media) {
      await admin.from("competitor_posts").upsert(
        {
          competitor_id: comp.id,
          agency_id: comp.agency_id,
          external_id: m.externalId,
          caption: m.caption.slice(0, 300),
          format: m.type,
          permalink: m.permalink,
          views: m.views,
          likes: m.likes,
          comments: m.comments,
          posted_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
          fetched_at: result.fetchedAt,
        },
        { onConflict: "competitor_id,external_id" }
      );
    }
    await admin
      .from("competitors")
      .update({
        name: result.profile.fullName || null,
        followers: result.profile.followers || null,
        last_synced_at: result.fetchedAt,
      })
      .eq("id", comp.id);

    return { ok: true, items: result.media.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync mislukt";
    return { ok: false, error: msg === "not_configured" ? "RAPIDAPI_KEY ontbreekt (Instagram-bron)." : msg };
  }
}
