// ════════════════════════════════════════════════════════════════
// YouTube-sync: haalt het laatste uploads van een kanaal op en schrijft
// content + content_metrics (bron 'youtube'). Bron = yt_channel_id op de
// klant (UC… id of @handle). Geen key/kanaal -> stil overslaan.
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchYouTube, youtubeConfigured } from "@/lib/integrations/youtube";
import { persistMedia } from "./persist";

export interface YouTubeSyncResult {
  ok: boolean;
  items?: number;
  error?: string;
}

export async function syncClientYouTube(clientId: string): Promise<YouTubeSyncResult> {
  if (!youtubeConfigured()) return { ok: false, error: "geen_bron" };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "geen_serverkey" };

  const { data: client } = await admin
    .from("clients")
    .select("yt_channel_id, agency_id")
    .eq("id", clientId)
    .single();
  if (!client?.yt_channel_id) return { ok: false, error: "geen_bron" };

  try {
    const result = await fetchYouTube(client.yt_channel_id as string);
    const count = await persistMedia(admin, clientId, "youtube", result);

    // Account-snapshot: abonnees per sync voor groei-tracking.
    if (result.profile.followers > 0) {
      await admin.from("account_metrics").insert({
        client_id: clientId,
        source: "youtube",
        followers: result.profile.followers,
        total_posts: result.profile.totalPosts || null,
        fetched_at: result.fetchedAt,
      });
    }

    // Integratie-status bijwerken (zelfde UI als IG).
    await admin.from("integrations").upsert(
      {
        agency_id: client.agency_id as string,
        client_id: clientId,
        provider: "youtube",
        status: "connected",
        external_id: client.yt_channel_id as string,
        last_synced_at: result.fetchedAt,
        last_error: null,
      },
      { onConflict: "client_id,provider", ignoreDuplicates: false }
    );

    return { ok: true, items: count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fout";
    await admin
      .from("integrations")
      .update({ status: "error", last_error: msg })
      .eq("client_id", clientId)
      .eq("provider", "youtube");
    return { ok: false, error: msg };
  }
}
