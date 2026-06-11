// ════════════════════════════════════════════════════════════════
// YouTube via de officiële Data API v3 (gratis, API-key).
// Haalt het laatste uploads van een kanaal + per-video statistieken
// (views, likes, comments). Genormaliseerd naar dezelfde media-shape
// als Instagram, zodat de sync bron-agnostisch blijft.
// ════════════════════════════════════════════════════════════════
import type { InstagramMedia, InstagramResult } from "./instagram";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const BASE = "https://www.googleapis.com/youtube/v3";

export const youtubeConfigured = () => Boolean(API_KEY);

/* eslint-disable @typescript-eslint/no-explicit-any */

// Accepteert een channelId (UC…), een @handle of een kanaal-URL en
// lost dat op naar het uploads-playlist-id + profielgegevens.
async function resolveChannel(idOrHandle: string): Promise<{ uploads: string; profile: InstagramResult["profile"] } | null> {
  const raw = idOrHandle.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//i, "").replace(/\/$/, "");
  let param: string;
  if (/^UC[\w-]{20,}$/.test(raw)) param = `id=${encodeURIComponent(raw)}`;
  else param = `forHandle=${encodeURIComponent(raw.replace(/^@?/, "@").replace(/^channel\//, ""))}`;

  const res = await fetch(
    `${BASE}/channels?part=contentDetails,snippet,statistics&${param}&key=${API_KEY}`
  );
  if (!res.ok) throw new Error(`youtube_channel_failed_${res.status}`);
  const data = await res.json();
  const ch = data.items?.[0];
  if (!ch) return null;

  return {
    uploads: ch.contentDetails?.relatedPlaylists?.uploads as string,
    profile: {
      username: ch.snippet?.customUrl || ch.snippet?.title || "",
      fullName: ch.snippet?.title || "",
      followers: Number(ch.statistics?.subscriberCount ?? 0),
      following: 0,
      totalPosts: Number(ch.statistics?.videoCount ?? 0),
      profilePic: ch.snippet?.thumbnails?.high?.url ?? null,
    },
  };
}

export async function fetchYouTube(channelIdOrHandle: string): Promise<InstagramResult> {
  if (!API_KEY) throw new Error("youtube_geen_key");

  const resolved = await resolveChannel(channelIdOrHandle);
  if (!resolved?.uploads) throw new Error("youtube_kanaal_niet_gevonden");

  // Laatste 25 uploads → video-ids.
  const plRes = await fetch(
    `${BASE}/playlistItems?part=contentDetails,snippet&maxResults=25&playlistId=${resolved.uploads}&key=${API_KEY}`
  );
  if (!plRes.ok) throw new Error(`youtube_uploads_failed_${plRes.status}`);
  const plData = await plRes.json();
  const ids: string[] = (plData.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) {
    return { profile: resolved.profile, media: [], fetchedAt: new Date().toISOString() };
  }

  // Statistieken + duur in één call (om Shorts te herkennen).
  const vRes = await fetch(
    `${BASE}/videos?part=statistics,snippet,contentDetails&id=${ids.join(",")}&key=${API_KEY}`
  );
  if (!vRes.ok) throw new Error(`youtube_videos_failed_${vRes.status}`);
  const vData = await vRes.json();

  const media: InstagramMedia[] = (vData.items || []).map((v: any) => {
    const dur = v.contentDetails?.duration || "";
    const secs = isoDurationToSeconds(dur);
    const isShort = secs > 0 && secs <= 60;
    return {
      externalId: String(v.id),
      type: isShort ? "Short" : "Reel", // langere video's tonen we als 'Reel' (video)
      caption: v.snippet?.title || "",
      likes: Number(v.statistics?.likeCount ?? 0),
      comments: Number(v.statistics?.commentCount ?? 0),
      views: v.statistics?.viewCount != null ? Number(v.statistics.viewCount) : null,
      reach: null,
      permalink: `https://www.youtube.com/watch?v=${v.id}`,
      timestamp: v.snippet?.publishedAt ? Math.floor(new Date(v.snippet.publishedAt).getTime() / 1000) : null,
    };
  });

  return { profile: resolved.profile, media, fetchedAt: new Date().toISOString() };
}

function isoDurationToSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
