// ════════════════════════════════════════════════════════════════
// Sync: haalt Instagram-data op en schrijft die weg naar `content` +
// `content_metrics`. Kiest de officiële Graph-bron boven de scrape-bron.
// Elke metric-rij krijgt bron + fetched_at (echte data of niets).
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInstagram, type InstagramResult } from "@/lib/integrations/instagram";
import { fetchGraphInstagram } from "@/lib/integrations/instagram-graph";

export interface SyncResult {
  ok: boolean;
  source?: "instagram_graph" | "instagram_scrape";
  items?: number;
  error?: string;
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

  let count = 0;
  for (const m of result.media) {
    // Content opzoeken of aanmaken (uniek per klant + external_id).
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

    // Nieuwe metric-snapshot (bron + tijdstempel).
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

  await admin
    .from("integrations")
    .update({ status: "connected", last_synced_at: result.fetchedAt, last_error: null })
    .eq("client_id", clientId)
    .eq("provider", source);

  return { ok: true, source, items: count };
}
