import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST = "instagram120.p.rapidapi.com";

// Simple rate limiting
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  if (data.success === false || data.response === 4) {
    return null; // Account not found or no data
  }
  return data;
}

function normalize(profile: any, postsData: any, reelsData: any) {
  const user = profile?.result || {};

  // --- FEED POSTS (carousels + photos) ---
  const rawPosts = postsData?.result?.edges || [];
  const feedPosts: any[] = rawPosts.map((e: any) => e.node || e);

  // --- REELS (separate endpoint) ---
  const rawReels = reelsData?.result?.edges || [];
  const reels: any[] = rawReels.map((e: any) => {
    const m = e.node?.media || e.media || e.node || e;
    return m;
  });

  // Feed post stats
  const feedLikes = feedPosts.reduce((s: number, p: any) => s + (p.like_count || p.edge_media_preview_like?.count || 0), 0);
  const feedComments = feedPosts.reduce((s: number, p: any) => s + (p.comment_count || p.edge_media_to_comment?.count || 0), 0);
  const avgFeedLikes = feedPosts.length > 0 ? Math.round(feedLikes / feedPosts.length) : 0;
  const avgFeedComments = feedPosts.length > 0 ? Math.round(feedComments / feedPosts.length) : 0;

  // Reels stats
  const reelViews = reels.map((r: any) => r.play_count || r.view_count || 0).filter((v: number) => v > 0);
  const totalReelViews = reelViews.reduce((s: number, v: number) => s + v, 0);
  const avgReelsViews = reelViews.length > 0 ? Math.round(totalReelViews / reelViews.length) : 0;
  const reelLikes = reels.reduce((s: number, r: any) => s + (r.like_count || 0), 0);
  const reelComments = reels.reduce((s: number, r: any) => s + (r.comment_count || 0), 0);
  const avgReelLikes = reels.length > 0 ? Math.round(reelLikes / reels.length) : 0;
  const avgReelComments = reels.length > 0 ? Math.round(reelComments / reels.length) : 0;

  // Combined stats (all content)
  const totalPosts = feedPosts.length + reels.length;
  const allLikes = feedLikes + reelLikes;
  const allComments = feedComments + reelComments;
  const avgLikes = totalPosts > 0 ? Math.round(allLikes / totalPosts) : 0;
  const avgComments = totalPosts > 0 ? Math.round(allComments / totalPosts) : 0;

  // Post frequency from feed timestamps
  const feedTimestamps = feedPosts
    .map((p: any) => p.taken_at || p.taken_at_timestamp || 0)
    .filter((t: number) => t > 0)
    .sort((a: number, b: number) => b - a);
  const lastPostDaysAgo = feedTimestamps[0]
    ? Math.floor((Date.now() / 1000 - feedTimestamps[0]) / 86400)
    : 99;

  let postsPerWeek = 0;
  if (feedTimestamps.length >= 2) {
    const span = (feedTimestamps[0] - feedTimestamps[feedTimestamps.length - 1]) / (7 * 86400);
    postsPerWeek = span > 0 ? Math.round((feedTimestamps.length / span) * 10) / 10 : feedTimestamps.length;
  }

  // Bio analysis
  const bio = (user.biography || "").toLowerCase();
  const externalUrl = user.external_url || "";
  const ctaKw = ["link", "boek", "plan", "dm", "stuur", "klik", "download", "gratis", "aanmelden", "book", "free", "click", "sign up", "apply", "join"];
  const authKw = ["founder", "ceo", "oprichter", "expert", "coach", "consultant", "helping", "ik help", "specialist", "ondernemer", "entrepreneur"];

  const followers = user.edge_followed_by?.count || user.follower_count || 0;
  const following = user.edge_follow?.count || user.following_count || 0;
  const mediaCount = user.edge_owner_to_timeline_media?.count || user.media_count || 0;

  // Reels percentage of total content
  const reelsPercentage = mediaCount > 0
    ? Math.round((reels.length / Math.min(mediaCount, feedPosts.length + reels.length)) * 100)
    : 0;

  return {
    username: user.username || "",
    followers,
    following,
    totalPosts: mediaCount,
    // Feed-specific
    feedPostCount: feedPosts.length,
    avgFeedLikes,
    avgFeedComments,
    // Reels-specific
    reelsCount: reels.length,
    reelsPercentage,
    avgReelsViews,
    avgReelLikes,
    avgReelComments,
    bestReelViews: reelViews.length > 0 ? Math.max(...reelViews) : 0,
    worstReelViews: reelViews.length > 0 ? Math.min(...reelViews) : 0,
    // Combined
    avgLikes,
    avgComments,
    lastPostDaysAgo,
    postsPerWeek,
    // Bio
    hasCTAInBio: ctaKw.some((kw) => bio.includes(kw)),
    hasLinkInBio: !!externalUrl && externalUrl.length > 5,
    hasAuthorityBio: authKw.some((kw) => bio.includes(kw)),
    // Rates
    engagementRate: followers > 0 ? Math.round(((avgLikes + avgComments) / followers) * 10000) / 100 : 0,
    viewToFollowerRatio: followers > 0 && avgReelsViews > 0 ? Math.round((avgReelsViews / followers) * 100) : 0,
    // Reels vs Feed comparison
    reelsOutperformFeed: avgReelLikes > avgFeedLikes,
    reelsLikesMultiplier: avgFeedLikes > 0 && avgReelLikes > 0
      ? Math.round((avgReelLikes / avgFeedLikes) * 10) / 10
      : null,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const handle = new URL(request.url).searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRate(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  if (!RAPIDAPI_KEY) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const clean = handle.replace("@", "").trim().toLowerCase();

  try {
    // Fetch all 3 endpoints in parallel
    const [profile, postsData, reelsData] = await Promise.all([
      apiFetch("profile", { username: clean }),
      apiFetch("posts", { username: clean }).catch(() => null),
      apiFetch("reels", { username: clean }).catch(() => null),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profiel niet gevonden of niet publiek" }, { status: 404 });
    }

    return NextResponse.json(normalize(profile, postsData, reelsData), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Instagram scrape error:", error);
    return NextResponse.json({ error: "Profiel niet gevonden of niet publiek" }, { status: 404 });
  }
}
