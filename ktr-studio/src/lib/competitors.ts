// ════════════════════════════════════════════════════════════════
// Competitor-tracking (Discover): volg accounts, sync hun posts via
// de bestaande Instagram-scraper en spot outliers automatisch.
// Outlier = post met views >= 2x de mediaan van datzelfde account.
// ════════════════════════════════════════════════════════════════
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export interface Competitor {
  id: string;
  handle: string;
  name: string | null;
  niche: string | null;
  followers: number | null;
  lastSyncedAt: string | null;
  postCount: number;
}

export interface CompetitorPost {
  id: string;
  competitorId: string;
  handle: string;
  caption: string;
  format: string;
  permalink: string | null;
  views: number;
  likes: number;
  comments: number;
  postedAt: string | null;
  outlier: boolean; // >= 2x mediaan van dit account
  multiplier: number; // views / mediaan
}

export async function getCompetitorFeed(): Promise<{ competitors: Competitor[]; posts: CompetitorPost[] }> {
  if (DEMO_MODE || !isSupabaseConfigured) return { competitors: [], posts: [] };
  const supabase = await createClient();
  if (!supabase) return { competitors: [], posts: [] };

  const [{ data: comps }, { data: posts }] = await Promise.all([
    supabase.from("competitors").select("id,handle,name,niche,followers,last_synced_at").order("created_at"),
    supabase
      .from("competitor_posts")
      .select("id,competitor_id,caption,format,permalink,views,likes,comments,posted_at")
      .order("views", { ascending: false })
      .limit(400),
  ]);

  const handleById = new Map((comps ?? []).map((c) => [c.id, c.handle as string]));

  // Mediaan views per competitor -> outlier-detectie.
  const viewsByComp = new Map<string, number[]>();
  for (const p of posts ?? []) {
    const arr = viewsByComp.get(p.competitor_id) ?? [];
    arr.push(Number(p.views ?? 0));
    viewsByComp.set(p.competitor_id, arr);
  }
  const medianByComp = new Map<string, number>();
  for (const [id, arr] of viewsByComp) {
    const sorted = [...arr].sort((a, b) => a - b);
    medianByComp.set(id, sorted[Math.floor(sorted.length / 2)] ?? 0);
  }

  const feed: CompetitorPost[] = (posts ?? []).map((p) => {
    const median = medianByComp.get(p.competitor_id) ?? 0;
    const views = Number(p.views ?? 0);
    const multiplier = median > 0 ? views / median : 1;
    return {
      id: p.id,
      competitorId: p.competitor_id,
      handle: handleById.get(p.competitor_id) ?? "—",
      caption: p.caption ?? "",
      format: p.format ?? "Reel",
      permalink: p.permalink ?? null,
      views,
      likes: Number(p.likes ?? 0),
      comments: Number(p.comments ?? 0),
      postedAt: p.posted_at ?? null,
      outlier: median > 0 && multiplier >= 2,
      multiplier: Math.round(multiplier * 10) / 10,
    };
  });

  const countByComp = new Map<string, number>();
  for (const p of posts ?? []) countByComp.set(p.competitor_id, (countByComp.get(p.competitor_id) ?? 0) + 1);

  const competitors: Competitor[] = (comps ?? []).map((c) => ({
    id: c.id,
    handle: c.handle,
    name: c.name ?? null,
    niche: c.niche ?? null,
    followers: c.followers != null ? Number(c.followers) : null,
    lastSyncedAt: c.last_synced_at ?? null,
    postCount: countByComp.get(c.id) ?? 0,
  }));

  return { competitors, posts: feed };
}
