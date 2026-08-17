// ════════════════════════════════════════════════════════════════
// Sync: haalt Instagram-data op en schrijft die weg naar `content` +
// `content_metrics`. Kiest de officiële Graph-bron boven de scrape-bron.
// Elke metric-rij krijgt bron + fetched_at (echte data of niets).
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInstagram, type InstagramResult } from "@/lib/integrations/instagram";
import { fetchGraphInstagram } from "@/lib/integrations/instagram-graph";
import { persistMedia } from "./persist";

export interface SyncResult {
  ok: boolean;
  source?: "instagram_graph" | "instagram_scrape";
  items?: number;
  error?: string;
  /** Diagnose voor de sync-melding: volgers + status per endpoint. */
  detail?: string;
}

export async function syncClientInstagram(clientId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "geen_serverkey" };

  const { data: integ } = await admin
    .from("integrations")
    .select("provider,access_token,external_id,status")
    .eq("client_id", clientId)
    .in("provider", ["instagram_graph", "instagram_scrape"]);

  const graph = integ?.find(
    (i) =>
      i.provider === "instagram_graph" &&
      i.status === "connected" &&
      i.access_token &&
      i.external_id
  );
  const { data: client } = await admin
    .from("clients")
    .select("ig_handle")
    .eq("id", clientId)
    .single();

  let result: InstagramResult;
  let source: "instagram_graph" | "instagram_scrape";
  try {
    if (graph) {
      result = await fetchGraphInstagram(graph.external_id as string, graph.access_token as string);
      source = "instagram_graph";
    } else if (client?.ig_handle) {
      result = await fetchInstagram(client.ig_handle);
      source = "instagram_scrape";
    } else {
      return { ok: false, error: "geen_bron" };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fout";
    if (graph) {
      await admin
        .from("integrations")
        .update({ status: "error", last_error: msg })
        .eq("client_id", clientId)
        .eq("provider", "instagram_graph");
    }
    return { ok: false, error: msg };
  }

  const count = await persistMedia(admin, clientId, source, result);

  // Account-snapshot: volgers/posts per sync (3x per dag) voor groei-tracking.
  if (result.profile.followers > 0) {
    await admin.from("account_metrics").insert({
      client_id: clientId,
      source,
      followers: result.profile.followers,
      total_posts: result.profile.totalPosts || null,
      fetched_at: result.fetchedAt,
    });
  }

  await admin
    .from("integrations")
    .update({ status: "connected", last_synced_at: result.fetchedAt, last_error: null })
    .eq("client_id", clientId)
    .eq("provider", source);

  const detail = [
    result.profile.followers > 0 ? `${result.profile.followers} volgers` : "profiel zonder volgers-data",
    result.debug,
  ]
    .filter(Boolean)
    .join(" · ");

  return { ok: true, source, items: count, detail };
}
