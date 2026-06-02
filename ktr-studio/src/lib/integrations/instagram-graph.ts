// ════════════════════════════════════════════════════════════════
// Instagram via de officiële Meta Graph API (productie-bron).
// Flow: Facebook Login (OAuth) → long-lived token → IG Business Account
// → media + insights (reach, plays). Genormaliseerd naar dezelfde shape
// als de scrape-bron, zodat de rest van de app bron-agnostisch is.
// ════════════════════════════════════════════════════════════════
import type { InstagramMedia, InstagramResult } from "./instagram";

const VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const APP_ID = process.env.META_APP_ID || "";
const APP_SECRET = process.env.META_APP_SECRET || "";
const REDIRECT = process.env.META_GRAPH_REDIRECT_URI || "";

export const graphConfigured = () => Boolean(APP_ID && APP_SECRET && REDIRECT);

const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

/** OAuth-dialoog-URL. `state` draagt client_id + CSRF-token. */
export function getAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT,
    state,
    scope: SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${p.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const p = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT,
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${p.toString()}`);
  if (!res.ok) throw new Error("token_exchange_failed");
  return res.json();
}

/** Korte token → long-lived token (~60 dagen). */
export async function getLongLivedToken(shortToken: string): Promise<TokenResponse> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${p.toString()}`);
  if (!res.ok) throw new Error("long_lived_failed");
  return res.json();
}

export interface IgAccount {
  igId: string;
  username: string;
  pageId: string;
}

/** Pagina's van de gebruiker → gekoppelde IG Business Accounts. */
export async function getInstagramAccounts(token: string): Promise<IgAccount[]> {
  const res = await fetch(
    `${GRAPH}/me/accounts?fields=id,instagram_business_account{id,username}&access_token=${token}`
  );
  if (!res.ok) throw new Error("pages_failed");
  const data = await res.json();
  const out: IgAccount[] = [];
  for (const page of data.data || []) {
    const ig = page.instagram_business_account;
    if (ig?.id) out.push({ igId: ig.id, username: ig.username || "", pageId: page.id });
  }
  return out;
}

function mapType(mediaType?: string, productType?: string): InstagramMedia["type"] {
  if (productType === "REELS") return "Reel";
  if (mediaType === "CAROUSEL_ALBUM") return "Carrousel";
  if (mediaType === "VIDEO") return "Reel";
  return "Carrousel";
}

/**
 * Profiel + recente media mét insights. Insights per post in een try:
 * lukt het niet, dan blijft views/reach `null` (geen verzonnen cijfer).
 */
export async function fetchGraphInstagram(igId: string, token: string): Promise<InstagramResult> {
  const profRes = await fetch(
    `${GRAPH}/${igId}?fields=username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`
  );
  if (!profRes.ok) throw new Error("profile_failed");
  const user = await profRes.json();

  const mediaRes = await fetch(
    `${GRAPH}/${igId}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=25&access_token=${token}`
  );
  if (!mediaRes.ok) throw new Error("media_failed");
  const mediaData = await mediaRes.json();

  const media: InstagramMedia[] = [];
  for (const m of mediaData.data || []) {
    const isReel = m.media_product_type === "REELS";
    let views: number | null = null;
    let reach: number | null = null;
    try {
      const metric = isReel ? "plays,reach" : "reach";
      const insRes = await fetch(
        `${GRAPH}/${m.id}/insights?metric=${metric}&access_token=${token}`
      );
      if (insRes.ok) {
        const ins = await insRes.json();
        for (const row of ins.data || []) {
          const val = row.values?.[0]?.value ?? null;
          if (row.name === "plays") views = val;
          if (row.name === "reach") reach = val;
        }
      }
    } catch {
      // insights niet beschikbaar voor dit mediatype — laat null staan.
    }
    media.push({
      externalId: String(m.id),
      type: mapType(m.media_type, m.media_product_type),
      caption: m.caption || "",
      likes: m.like_count || 0,
      comments: m.comments_count || 0,
      views,
      reach,
      permalink: m.permalink || null,
      timestamp: m.timestamp ? Math.floor(new Date(m.timestamp).getTime() / 1000) : null,
    });
  }

  return {
    profile: {
      username: user.username || "",
      fullName: user.name || "",
      followers: user.followers_count || 0,
      following: user.follows_count || 0,
      totalPosts: user.media_count || 0,
      profilePic: user.profile_picture_url || null,
    },
    media,
    fetchedAt: new Date().toISOString(),
  };
}
