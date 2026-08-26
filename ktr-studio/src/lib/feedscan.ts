// ════════════════════════════════════════════════════════════════
// De ochtendscan: verse YouTube-video's uit Menno's volglijst
// (agencies.feed_channels) en interesse-onderwerpen (feed_topics).
//
// Categorieën:
//  - outlier   → doet het ≥2× de kanaal-mediaan (format werkt!)
//  - knowledge → uit een onderwerp-zoekopdracht (mag buiten de niche)
//  - concept   → vers van een gevolgd kanaal, concept om te pakken
//
// Kosten bewust laag: max ~6 nieuwe items/dag, samenvatting met het
// snelle model op titel+beschrijving (geen dure transcript-runs).
// ════════════════════════════════════════════════════════════════
import { generateText } from "@/lib/ai";
import { channelParam } from "@/lib/sync/ig-fill";

const YT_KEY = process.env.YOUTUBE_API_KEY ?? "";
const MAX_NEW_PER_RUN = 6;

interface Candidate {
  id: string;
  title: string;
  channel: string;
  views: number;
  outlier: number | null;
  category: "outlier" | "knowledge" | "concept";
  description: string;
  publishedAt: string;
}

const SUMMARY_TEMPLATE = `Je bent de content-researcher van Menno Kater (content-strateeg, helpt founders met YouTube en Reels). Hieronder een YouTube-video (titel + beschrijving). Schrijf in het Nederlands, max 3 zinnen:
1. Waar de video over gaat.
2. Welk concept, format of inzicht Menno eruit kan pakken voor zijn eigen reels/video's.
Nuchter, direct, geen em-dashes, geen opsomming van de metadata.

{{onderwerp}}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function yt(path: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${YT_KEY}`, {
    next: { revalidate: 3600 },
  });
  return res.ok ? res.json() : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runFeedScan(admin: any, agencyId: string): Promise<{ added: number; error?: string }> {
  if (!YT_KEY) return { added: 0, error: "YOUTUBE_API_KEY ontbreekt" };

  const { data: ag } = await admin.from("agencies").select("feed_channels, feed_topics").eq("id", agencyId).maybeSingle();
  const channels = String(ag?.feed_channels ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 8);
  const topics = String(ag?.feed_topics ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 2);
  if (!channels.length && !topics.length) return { added: 0, error: "geen kanalen of onderwerpen ingesteld" };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const candidates: Candidate[] = [];

  // 1. Gevolgde kanalen: laatste uploads + outlier-score t.o.v. de mediaan.
  for (const handle of channels) {
    try {
      const p = channelParam(handle);
      if (!p) continue;
      const ch = await yt(`channels?part=contentDetails,snippet&${p.key}=${encodeURIComponent(p.value)}`);
      const c = ch?.items?.[0];
      const uploads = c?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) continue;
      const items = await yt(`playlistItems?part=contentDetails,snippet&playlistId=${uploads}&maxResults=10`);
      const ids = (items?.items ?? []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
      if (!ids.length) continue;
      const vids = await yt(`videos?part=statistics,snippet&id=${ids.join(",")}`);
      const rows = (vids?.items ?? []).map((v: any) => ({
        id: String(v.id),
        title: String(v.snippet?.title ?? ""),
        channel: String(c?.snippet?.title ?? handle),
        views: Number(v.statistics?.viewCount ?? 0),
        description: String(v.snippet?.description ?? "").slice(0, 500),
        publishedAt: String(v.snippet?.publishedAt ?? ""),
      }));
      const sortedViews = rows.map((r: any) => r.views).sort((a: number, b: number) => a - b);
      const median = sortedViews[Math.floor(sortedViews.length / 2)] || 1;
      for (const r of rows) {
        const ratio = r.views / median;
        const isFresh = r.publishedAt >= weekAgo;
        if (ratio >= 2) candidates.push({ ...r, outlier: Math.round(ratio * 10) / 10, category: "outlier" });
        else if (isFresh) candidates.push({ ...r, outlier: null, category: "concept" });
      }
    } catch {
      // kanaal overslaan, rest doorlaten
    }
  }

  // 2. Onderwerpen (mag buiten de niche): best bekeken van de afgelopen week.
  for (const topic of topics) {
    try {
      const found = await yt(
        `search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=viewCount&publishedAfter=${encodeURIComponent(weekAgo)}&maxResults=5&relevanceLanguage=nl`
      );
      const ids = (found?.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean);
      if (!ids.length) continue;
      const vids = await yt(`videos?part=statistics,snippet&id=${ids.join(",")}`);
      for (const v of vids?.items ?? []) {
        candidates.push({
          id: String(v.id),
          title: String(v.snippet?.title ?? ""),
          channel: String(v.snippet?.channelTitle ?? ""),
          views: Number(v.statistics?.viewCount ?? 0),
          outlier: null,
          category: "knowledge",
          description: String(v.snippet?.description ?? "").slice(0, 500),
          publishedAt: String(v.snippet?.publishedAt ?? ""),
        });
      }
    } catch {
      // onderwerp overslaan
    }
  }

  if (!candidates.length) return { added: 0 };

  // Al gezien? Nieuwe eerst op kracht (outliers boven, dan views).
  const { data: seen } = await admin.from("feed_items").select("id").in("id", candidates.map((c) => c.id));
  const seenIds = new Set((seen ?? []).map((r: { id: string }) => r.id));
  const fresh = candidates
    .filter((c) => !seenIds.has(c.id))
    .sort((a, b) => (b.outlier ?? 0) - (a.outlier ?? 0) || b.views - a.views)
    // per video maar één keer (kan uit kanaal én zoekopdracht komen)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .slice(0, MAX_NEW_PER_RUN);

  let added = 0;
  for (const c of fresh) {
    let summary: string | null = null;
    try {
      const { text, mock } = await generateText({
        template: SUMMARY_TEMPLATE,
        input: `Titel: ${c.title}\nKanaal: ${c.channel}\nViews: ${c.views}\nBeschrijving: ${c.description}`,
        model: "fast",
      });
      if (!mock) summary = text.trim().replace(/\*\*(.+?)\*\*/g, "$1");
    } catch {
      // samenvatting is nice-to-have
    }
    const { error } = await admin.from("feed_items").insert({
      id: c.id,
      agency_id: agencyId,
      title: c.title,
      channel: c.channel,
      url: `https://www.youtube.com/watch?v=${c.id}`,
      views: c.views,
      outlier: c.outlier,
      category: c.category,
      summary,
    });
    if (!error) added += 1;
  }

  return { added };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
