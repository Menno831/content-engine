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

async function fetchProfile(username: string) {
  const res = await fetch(`https://${RAPIDAPI_HOST}/api/instagram/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`Profile: ${res.status}`);
  const data = await res.json();
  if (data.success === false || data.response === 4) {
    throw new Error("Account not found");
  }
  return data;
}

async function fetchPosts(username: string) {
  const res = await fetch(`https://${RAPIDAPI_HOST}/api/instagram/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    body: JSON.stringify({ username, next: "" }),
  });
  if (!res.ok) throw new Error(`Posts: ${res.status}`);
  const data = await res.json();
  if (data.success === false || data.response === 4) {
    return { result: { edges: [] } };
  }
  return data;
}

function normalize(profile: any, postsData: any) {
  // instagram120 returns { result: { ... } }
  const user = profile?.result || profile?.data || profile;
  const rawEdges = postsData?.result?.edges || postsData?.data?.edges || [];
  const recent: any[] = Array.isArray(rawEdges) ? rawEdges.slice(0, 30).map((e: any) => e.node || e) : [];

  const reels = recent.filter(
    (p: any) => p.media_type === 2 || p.product_type === "clips" || p.is_video || p.video_url || p.__typename === "GraphVideo"
  );

  const totalLikes = recent.reduce((s: number, p: any) => s + (p.like_count || p.edge_media_preview_like?.count || 0), 0);
  const totalComments = recent.reduce((s: number, p: any) => s + (p.comment_count || p.edge_media_to_comment?.count || 0), 0);
  const avgLikes = recent.length > 0 ? Math.round(totalLikes / recent.length) : 0;
  const avgComments = recent.length > 0 ? Math.round(totalComments / recent.length) : 0;

  const reelsViews = reels.filter((r: any) => r.view_count || r.video_view_count || r.play_count || r.video_views);
  const totalReelsViews = reelsViews.reduce((s: number, r: any) => s + (r.play_count || r.video_view_count || r.view_count || r.video_views || 0), 0);
  const avgReelsViews = reelsViews.length > 0 ? Math.round(totalReelsViews / reelsViews.length) : 0;

  const timestamps = recent.map((p: any) => p.taken_at || p.taken_at_timestamp || 0).filter((t: number) => t > 0).sort((a: number, b: number) => b - a);
  const lastPostDaysAgo = timestamps[0] ? Math.floor((Date.now() / 1000 - timestamps[0]) / 86400) : 99;

  let postsPerWeek = 0;
  if (timestamps.length >= 2) {
    const span = (timestamps[0] - timestamps[timestamps.length - 1]) / (7 * 86400);
    postsPerWeek = span > 0 ? Math.round((timestamps.length / span) * 10) / 10 : timestamps.length;
  }

  const bio = (user.biography || "").toLowerCase();
  const externalUrl = user.external_url || "";

  const ctaKw = ["link", "boek", "plan", "dm", "stuur", "klik", "download", "gratis", "aanmelden", "book", "free", "click", "sign up", "apply", "join"];
  const authKw = ["founder", "ceo", "oprichter", "expert", "coach", "consultant", "helping", "ik help", "specialist", "ondernemer", "entrepreneur"];

  const followers = user.edge_followed_by?.count || user.follower_count || 0;
  const following = user.edge_follow?.count || user.following_count || 0;
  const totalPosts = user.edge_owner_to_timeline_media?.count || user.media_count || 0;

  return {
    username: user.username || "",
    followers,
    following,
    totalPosts,
    reelsCount: reels.length,
    reelsPercentage: recent.length > 0 ? Math.round((reels.length / recent.length) * 100) : 0,
    avgReelsViews,
    avgLikes,
    avgComments,
    lastPostDaysAgo,
    postsPerWeek,
    hasCTAInBio: ctaKw.some((kw) => bio.includes(kw)),
    hasLinkInBio: !!externalUrl && externalUrl.length > 5,
    hasAuthorityBio: authKw.some((kw) => bio.includes(kw)),
    engagementRate: followers > 0 ? Math.round(((avgLikes + avgComments) / followers) * 10000) / 100 : 0,
    viewToFollowerRatio: followers > 0 && avgReelsViews > 0 ? Math.round((avgReelsViews / followers) * 100) : 0,
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
    const [profile, postsData] = await Promise.all([fetchProfile(clean), fetchPosts(clean)]);
    return NextResponse.json(normalize(profile, postsData), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Instagram scrape error:", error);
    return NextResponse.json({ error: "Profiel niet gevonden of niet publiek" }, { status: 404 });
  }
}
