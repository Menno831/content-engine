// ════════════════════════════════════════════════════════════════
// Eigen-kanalen-sync: schrijft dagelijkse snapshots naar
// channel_stats voor de kanalen die automatisch kunnen:
//   instagram → RAPIDAPI_KEY (zelfde scraper als klanten/competitors)
//   youtube   → YOUTUBE_API_KEY
//   website   → CLARITY_API_TOKEN (Clarity Data Export API)
// LinkedIn heeft geen bruikbare API — dat blijft handmatig invullen.
// Eén snapshot per kanaal per dag (upsert), dus vaker draaien kan
// geen kwaad.
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { todayStr } from "@/lib/dates";
import { fetchInstagram } from "@/lib/integrations/instagram";
import { fetchYouTube } from "@/lib/integrations/youtube";
import { checkSite } from "@/lib/site-check";

export interface ChannelSyncResult {
  channel: string;
  ok: boolean;
  error?: string;
}

// Views van de recentste reels/video's bij elkaar — één indicatievе
// teller per snapshot, geen dubbeltellingen over dagen heen nodig
// omdat het momentopnames zijn.
function sumViews(media: { views: number | null }[]): number | null {
  const withViews = media.filter((m) => m.views != null);
  if (!withViews.length) return null;
  return withViews.reduce((s, m) => s + (m.views ?? 0), 0);
}

// Uit de recentste uploads: gemiddelde, som van likes/reacties en de
// best lopende — dát zegt meer over een kanaal dan één totaal.
function mediaStats(media: { views: number | null; likes: number; comments: number; caption: string; permalink: string | null }[]) {
  const withViews = media.filter((m) => m.views != null);
  const top = withViews.reduce<typeof media[number] | null>((best, m) => (!best || (m.views ?? 0) > (best.views ?? 0) ? m : best), null);
  return {
    likes: media.reduce((s, m) => s + (m.likes ?? 0), 0),
    comments: media.reduce((s, m) => s + (m.comments ?? 0), 0),
    avg_views: withViews.length ? Math.round(withViews.reduce((s, m) => s + (m.views ?? 0), 0) / withViews.length) : null,
    top_title: top ? top.caption.slice(0, 120) || null : null,
    top_views: top?.views ?? null,
    top_url: top?.permalink ?? null,
  };
}

async function fetchClarityVisitors(): Promise<{ visitors: number; views: number | null } | null> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return null;
  // Data Export API: totalen van gisteren (numOfDays=1).
  const res = await fetch("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Clarity gaf ${res.status}`);
  const data = (await res.json()) as { metricName?: string; information?: Record<string, unknown>[] }[];
  const traffic = Array.isArray(data) ? data.find((m) => m.metricName === "Traffic") : null;
  const info = traffic?.information?.[0];
  if (!info) return null;
  const visitors = Number(info.distantUserCount ?? info.distinctUserCount ?? info.totalSessionCount ?? 0);
  const views = info.pagesViews != null ? Number(info.pagesViews) : null;
  if (!visitors) return null;
  return { visitors, views };
}

export async function syncOwnChannelsCore(agencyId?: string): Promise<ChannelSyncResult[]> {
  const admin = createAdminClient();
  if (!admin) return [{ channel: "alle", ok: false, error: "serverkey ontbreekt (SUPABASE_SERVICE_ROLE_KEY) — sync kan niet draaien" }];

  let q = admin.from("agencies").select("id, own_ig_handle, own_yt_channel, own_website");
  if (agencyId) q = q.eq("id", agencyId);
  const { data: agencies } = await q;

  const today = todayStr();
  const results: ChannelSyncResult[] = [];

  for (const a of agencies ?? []) {
    const upsert = async (
      channel: string,
      source: string,
      values: {
        followers?: number | null; visitors?: number | null; views?: number | null; videos?: number | null;
        likes?: number | null; comments?: number | null; avg_views?: number | null;
        top_title?: string | null; top_views?: number | null; top_url?: string | null;
      }
    ) => {
      const { error } = await admin.from("channel_stats").upsert(
        {
          agency_id: a.id,
          channel,
          stat_date: today,
          followers: values.followers ?? null,
          visitors: values.visitors ?? null,
          views: values.views ?? null,
          videos: values.videos ?? null,
          likes: values.likes ?? null,
          comments: values.comments ?? null,
          avg_views: values.avg_views ?? null,
          top_title: values.top_title ?? null,
          top_views: values.top_views ?? null,
          top_url: values.top_url ?? null,
          source,
        },
        { onConflict: "agency_id,channel,stat_date" }
      );
      if (error) throw new Error(error.message);
    };

    if (a.own_ig_handle) {
      try {
        const r = await fetchInstagram(a.own_ig_handle as string);
        await upsert("instagram", "instagram-sync", { followers: r.profile.followers || null, views: sumViews(r.media), videos: r.profile.totalPosts || null, ...mediaStats(r.media) });
        results.push({ channel: "instagram", ok: true });
      } catch (e) {
        results.push({
          channel: "instagram",
          ok: false,
          error: e instanceof Error && e.message === "not_configured" ? "RAPIDAPI_KEY ontbreekt" : e instanceof Error ? e.message : "sync mislukt",
        });
      }
    }

    if (a.own_yt_channel) {
      try {
        const r = await fetchYouTube(a.own_yt_channel as string);
        await upsert("youtube", "youtube-api", { followers: r.profile.followers || null, views: sumViews(r.media), videos: r.profile.totalPosts || null, ...mediaStats(r.media) });
        results.push({ channel: "youtube", ok: true });
      } catch (e) {
        results.push({
          channel: "youtube",
          ok: false,
          error:
            e instanceof Error && ["not_configured", "youtube_geen_key"].includes(e.message)
              ? "YOUTUBE_API_KEY ontbreekt"
              : e instanceof Error && e.message === "youtube_kanaal_niet_gevonden"
                ? "YouTube-kanaal niet gevonden — check de kanaal-URL of het @handle"
                : e instanceof Error
                  ? e.message
                  : "sync mislukt",
        });
      }
    }

    // Eigen site: bereikbaarheid, snelheid en de basis-SEO — elke run.
    if (a.own_website) {
      try {
        const c = await checkSite(a.own_website as string);
        await admin.from("site_checks").insert({
          agency_id: a.id, url: c.url, ok: c.ok, status: c.status, ms: c.ms, https: c.https,
          title: c.title, description: c.description, has_viewport: c.hasViewport, has_canonical: c.hasCanonical,
          has_og_image: c.hasOgImage, h1_count: c.h1Count, issues: c.issues,
        });
        results.push({ channel: "site-check", ok: c.ok, error: c.ok ? undefined : c.issues[0] });
      } catch (e) {
        results.push({ channel: "site-check", ok: false, error: e instanceof Error ? e.message : "check mislukt" });
      }
    }

    try {
      const clarity = await fetchClarityVisitors();
      if (clarity) {
        await upsert("website", "clarity", { visitors: clarity.visitors, views: clarity.views });
        results.push({ channel: "website", ok: true });
      }
      // Geen token → stil overslaan; dat is de normale toestand tot de
      // CLARITY_API_TOKEN gezet is.
    } catch (e) {
      results.push({ channel: "website", ok: false, error: e instanceof Error ? e.message : "sync mislukt" });
    }
  }

  return results;
}
