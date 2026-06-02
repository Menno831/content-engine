// ════════════════════════════════════════════════════════════════
// Instagram-ophaallogica (RapidAPI scrape — tijdelijke/test-bron).
// Gebaseerd op de bewezen aanpak uit de marketingsite. Geeft naast
// profiel-aggregaten ook per-post metrics terug, zodat we ze als
// content_metrics (met bron + tijdstempel) kunnen opslaan.
//
// Later vervangen door de officiële Meta Graph API (instagram_graph).
// ════════════════════════════════════════════════════════════════

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "instagram120.p.rapidapi.com";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InstagramMedia {
  externalId: string;
  type: "Reel" | "Carrousel" | "Story" | "Short";
  caption: string;
  likes: number;
  comments: number;
  views: number | null; // alleen reels/video
  reach: number | null; // alleen via officiële Graph API
  permalink: string | null;
  timestamp: number | null;
}

export interface InstagramProfile {
  username: string;
  fullName: string;
  followers: number;
  following: number;
  totalPosts: number;
  profilePic: string | null;
}

export interface InstagramResult {
  profile: InstagramProfile;
  media: InstagramMedia[];
  fetchedAt: string;
}

export const instagramConfigured = () => Boolean(RAPIDAPI_KEY);

async function apiFetch(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://${RAPIDAPI_HOST}/api/instagram/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status}`);
  const data = await res.json();
  if (data?.success === false || data?.response === 4) return null;
  return data;
}

function mapMedia(raw: any, isReel: boolean): InstagramMedia {
  const m = raw.node?.media || raw.media || raw.node || raw;
  const isCarousel = (m.carousel_media_count ?? 0) > 1 || m.media_type === 8;
  return {
    externalId: String(m.id || m.pk || m.code || ""),
    type: isReel ? "Reel" : isCarousel ? "Carrousel" : "Reel",
    caption:
      m.caption?.text ||
      m.edge_media_to_caption?.edges?.[0]?.node?.text ||
      "",
    likes: m.like_count || m.edge_media_preview_like?.count || 0,
    comments: m.comment_count || m.edge_media_to_comment?.count || 0,
    views: isReel ? m.play_count || m.view_count || null : null,
    reach: null, // scrape-bron levert geen reach
    permalink: m.code ? `https://www.instagram.com/p/${m.code}/` : null,
    timestamp: m.taken_at || m.taken_at_timestamp || null,
  };
}

/**
 * Haalt profiel + recente media op. Gooit een fout als de bron niet
 * geconfigureerd is of het profiel niet gevonden/publiek is — de
 * aanroeper vertaalt dat naar een nette "niet verbonden"-staat.
 */
export async function fetchInstagram(handle: string): Promise<InstagramResult> {
  if (!RAPIDAPI_KEY) throw new Error("not_configured");
  const clean = handle.replace("@", "").trim().toLowerCase();

  const [profile, postsData, reelsData] = await Promise.all([
    apiFetch("profile", { username: clean }),
    apiFetch("posts", { username: clean }).catch(() => null),
    apiFetch("reels", { username: clean }).catch(() => null),
  ]);

  if (!profile) throw new Error("not_found");
  const user = profile.result || {};

  const feed: any[] = (postsData?.result?.edges || []).map((e: any) => e.node || e);
  const reels: any[] = (reelsData?.result?.edges || []).map((e: any) => e);

  const media: InstagramMedia[] = [
    ...reels.map((r) => mapMedia(r, true)),
    ...feed.map((p) => mapMedia(p, false)),
  ].filter((m) => m.externalId);

  return {
    profile: {
      username: user.username || clean,
      fullName: user.full_name || "",
      followers: user.edge_followed_by?.count || user.follower_count || 0,
      following: user.edge_follow?.count || user.following_count || 0,
      totalPosts:
        user.edge_owner_to_timeline_media?.count || user.media_count || 0,
      profilePic: user.profile_pic_url_hd || user.profile_pic_url || null,
    },
    media,
    fetchedAt: new Date().toISOString(),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
