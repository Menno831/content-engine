import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-20251.p.rapidapi.com";

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
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/userinfo/?username_or_id=${username}`,
    { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": RAPIDAPI_HOST } }
  );
  if (!res.ok) throw new Error(`Profile: ${res.status}`);
  return res.json();
}

async function fetchPosts(username: string) {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/userposts/?username_or_id=${username}`,
    { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": RAPIDAPI_HOST } }
  );
  if (!res.ok) throw new Error(`Posts: ${res.status}`);
  return res.json();
}

function normalize(profile: any, postsData: any) {
  const user = profile?.data || profile;
  const posts = postsData?.data?.items || postsData?.data || postsData?.items || [];
  const recent: any[] = Array.isArray(posts) ? posts.slice(0, 30) : [];

  const reels = recent.filter(
    (p: any) => p.media_type === 2 || p.product_type === "clips" || p.is_video || p.video_url
  );

  const totalLikes = recent.reduce((s: number, p: any) => s + (p.like_count || 0), 0);
  const totalComments = recent.reduce((s: number, p: any) => s + (p.comment_count || 0), 0);
  const avgLikes = recent.length > 0 ? Math.round(totalLikes / recent.length) : 0;
  const avgComments = recent.length > 0 ? Math.round(totalComments / recent.length) : 0;

  const reelsViews = reels.filter((r: any) => r.view_count || r.video_view_count || r.play_count);
  const totalReelsViews = reelsViews.reduce((s: number, r: any) => s + (r.play_count || r.view_count || r.video_view_count || 0), 0);
  const avgReelsViews = reelsViews.length > 0 ? Math.round(totalReelsViews / reelsViews.length) : 0;

  const timestamps = recent.map((p: any) => p.taken_at || 0).filter((t: number) => t > 0).sort((a: number, b: number) => b - a);
  const lastPostDaysAgo = timestamps[0] ? Math.floor((Date.now() / 1000 - timestamps[0]) / 86400) : 99;

  let postsPerWeek = 0;
  if (timestamps.length >= 2) {
    const span = (timestamps[0] - timestamps[timestamps.length - 1]) / (7 * 86400);
    postsPerWeek = span > 0 ? Math.round((timestamps.length / span) * 10) / 10 : timestamps.length;
  }

  const bio = (user.biography || user.bio || "").toLowerCase();
  const externalUrl = user.external_url || "";

  const ctaKw = ["link", "boek", "plan", "dm", "stuur", "klik", "download", "gratis", "aanmelden", "book", "free", "click", "sign up", "apply", "join"];
  const authKw = ["founder", "ceo", "oprichter", "expert", "coach", "consultant", "helping", "ik help", "specialist", "ondernemer", "entrepreneur"];

  const followers = user.follower_count || 0;

  return {
    username: user.username || "",
    followers,
    following: user.following_count || 0,
    totalPosts: user.media_count || 0,
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
