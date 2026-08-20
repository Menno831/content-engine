// ════════════════════════════════════════════════════════════════
// Klant-werkstation: alle data voor de tabs op één klantpagina
// (stats, stories, leads, links, calls, health). Eén plek zodat de
// pagina's zelf dun blijven.
// ════════════════════════════════════════════════════════════════
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

const live = () => !(DEMO_MODE || !isSupabaseConfigured);

// ── Stats ───────────────────────────────────────────────────────

export interface PlatformStats {
  platform: "instagram" | "youtube" | "tiktok";
  followers: number | null;
  followerDelta: number;
  reach: number;
  likes: number;
  comments: number;
  posts: number;
  engagement: number; // (likes + comments) / reach
}

export interface RecentPost {
  id: string;
  date: string | null;
  title: string;
  platform: string;
  permalink: string | null;
  reach: number;
  likes: number;
  comments: number;
}

export interface ClientStats {
  platforms: PlatformStats[];
  total: PlatformStats;
  recent: RecentPost[];
  /** Volgersgroei per dag, gemeten over de beschikbare snapshots. */
  growthPerDay: number;
  projection: { days30: number; days90: number; year: number };
  milestone: { target: number; daysAway: number | null; pct: number } | null;
  lastSync: string | null;
}

const emptyPlatform = (platform: PlatformStats["platform"]): PlatformStats => ({
  platform,
  followers: null,
  followerDelta: 0,
  reach: 0,
  likes: 0,
  comments: 0,
  posts: 0,
  engagement: 0,
});

function platformOf(source: string | null): PlatformStats["platform"] {
  if (source === "youtube") return "youtube";
  if (source === "tiktok") return "tiktok";
  return "instagram";
}

// Ronde mijlpaal boven het huidige aantal volgers (1K, 5K, 10K, 25K…).
function nextMilestone(followers: number): number {
  const steps = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
  return steps.find((s) => s > followers) ?? Math.ceil(followers / 1_000_000 + 1) * 1_000_000;
}

export async function getClientStats(clientId: string, days = 7): Promise<ClientStats | null> {
  if (!live()) return null;
  const supabase = await createClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [{ data: contentRows }, { data: metricRows }, { data: accountRows }] = await Promise.all([
    supabase
      .from("content")
      .select("id,title,hook,source,permalink,published_at")
      .eq("client_id", clientId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(200),
    supabase
      .from("content_metrics")
      .select("content_id,views,reach,likes,comments,fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(4000),
    supabase
      .from("account_metrics")
      .select("source,followers,fetched_at")
      .eq("client_id", clientId)
      .order("fetched_at", { ascending: false })
      .limit(400),
  ]);

  // Laatste metric per post (rijen zijn al aflopend op fetched_at).
  const latest = new Map<string, { reach: number; likes: number; comments: number }>();
  for (const m of metricRows ?? []) {
    if (latest.has(m.content_id)) continue;
    latest.set(m.content_id, {
      reach: Number(m.reach ?? m.views ?? 0),
      likes: Number(m.likes ?? 0),
      comments: Number(m.comments ?? 0),
    });
  }

  const byPlatform = new Map<PlatformStats["platform"], PlatformStats>();
  const recent: RecentPost[] = [];

  for (const c of contentRows ?? []) {
    const platform = platformOf(c.source as string | null);
    const m = latest.get(c.id) ?? { reach: 0, likes: 0, comments: 0 };
    const inWindow = (c.published_at as string) >= since;

    if (inWindow) {
      const p = byPlatform.get(platform) ?? emptyPlatform(platform);
      p.posts += 1;
      p.reach += m.reach;
      p.likes += m.likes;
      p.comments += m.comments;
      byPlatform.set(platform, p);
    }
    if (recent.length < 12) {
      recent.push({
        id: c.id,
        date: (c.published_at as string)?.slice(0, 10) ?? null,
        title: (c.hook || c.title || "").slice(0, 120),
        platform,
        permalink: c.permalink ?? null,
        reach: m.reach,
        likes: m.likes,
        comments: m.comments,
      });
    }
  }

  // Volgers: nieuwste snapshot per bron + groei over de hele reeks.
  let lastSync: string | null = null;
  const followerSeries = new Map<PlatformStats["platform"], { followers: number; at: string }[]>();
  for (const a of accountRows ?? []) {
    const platform = platformOf(a.source as string | null);
    const arr = followerSeries.get(platform) ?? [];
    arr.push({ followers: Number(a.followers ?? 0), at: a.fetched_at as string });
    followerSeries.set(platform, arr);
    if (!lastSync || (a.fetched_at as string) > lastSync) lastSync = a.fetched_at as string;
  }

  let growthPerDay = 0;
  for (const [platform, series] of followerSeries) {
    const p = byPlatform.get(platform) ?? emptyPlatform(platform);
    p.followers = series[0]?.followers ?? null;
    const inWindow = series.filter((s) => s.at >= since);
    const oldest = inWindow[inWindow.length - 1] ?? series[series.length - 1];
    if (oldest && p.followers != null) {
      p.followerDelta = p.followers - oldest.followers;
      const spanDays = Math.max(1, (Date.now() - new Date(oldest.at).getTime()) / 86_400_000);
      growthPerDay += p.followerDelta / spanDays;
    }
    byPlatform.set(platform, p);
  }

  for (const p of byPlatform.values()) {
    p.engagement = p.reach > 0 ? ((p.likes + p.comments) / p.reach) * 100 : 0;
  }

  const platforms = [...byPlatform.values()].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
  const total = platforms.reduce((acc, p) => {
    acc.followers = (acc.followers ?? 0) + (p.followers ?? 0);
    acc.followerDelta += p.followerDelta;
    acc.reach += p.reach;
    acc.likes += p.likes;
    acc.comments += p.comments;
    acc.posts += p.posts;
    return acc;
  }, emptyPlatform("instagram"));
  total.engagement = total.reach > 0 ? ((total.likes + total.comments) / total.reach) * 100 : 0;

  const followersNow = total.followers ?? 0;
  const perDay = Math.round(growthPerDay * 10) / 10;
  const target = nextMilestone(followersNow);
  const toGo = target - followersNow;

  return {
    platforms,
    total,
    recent,
    growthPerDay: perDay,
    projection: {
      days30: Math.round(followersNow + perDay * 30),
      days90: Math.round(followersNow + perDay * 90),
      year: Math.round(followersNow + perDay * 365),
    },
    milestone: followersNow
      ? {
          target,
          daysAway: perDay > 0 ? Math.ceil(toGo / perDay) : null,
          pct: Math.min(100, Math.round((followersNow / target) * 100)),
        }
      : null,
    lastSync,
  };
}

// ── Links ───────────────────────────────────────────────────────

export interface ClientLink {
  id: string;
  label: string;
  url: string;
  category: string | null;
}

export async function getClientLinks(clientId: string): Promise<ClientLink[]> {
  if (!live()) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("client_links")
    .select("id,label,url,category")
    .eq("client_id", clientId)
    .order("created_at");
  return (data ?? []) as ClientLink[];
}

// ── Leads per klant ─────────────────────────────────────────────

export interface ClientLead {
  id: string;
  name: string;
  source: string | null;
  sourceLabel: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  stage: string;
  value: number;
  setter: string | null;
  closer: string | null;
  createdAt: string | null;
}

export interface LeadFunnel {
  leads: number;
  booked: number;
  showed: number;
  won: number;
  cash: number;
}

export async function getClientLeads(
  clientId: string,
  days = 30
): Promise<{ rows: ClientLead[]; funnel: LeadFunnel; bySource: { source: string; leads: number; won: number; cash: number }[] }> {
  const empty = { rows: [], funnel: { leads: 0, booked: 0, showed: 0, won: 0, cash: 0 }, bySource: [] };
  if (!live()) return empty;
  const supabase = await createClient();
  if (!supabase) return empty;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  // score/instagram/... komen uit migratie 025 — val terug op de basis.
  let data = (
    await supabase
      .from("leads")
      .select("id,name,source,source_label,instagram,email,phone,score,stage,value,setter,closer,created_at")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
  ).data as Record<string, unknown>[] | null;
  if (!data) {
    data = (
      await supabase
        .from("leads")
        .select("id,name,source_label,stage,value,setter,created_at")
        .eq("client_id", clientId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
    ).data as Record<string, unknown>[] | null;
  }

  const rows: ClientLead[] = (data ?? []).map((l) => ({
    id: String(l.id),
    name: String(l.name ?? "—"),
    source: (l.source as string) ?? null,
    sourceLabel: (l.source_label as string) ?? null,
    instagram: (l.instagram as string) ?? null,
    email: (l.email as string) ?? null,
    phone: (l.phone as string) ?? null,
    score: Number(l.score ?? 1),
    stage: String(l.stage ?? "nieuw"),
    value: Number(l.value ?? 0),
    setter: (l.setter as string) ?? null,
    closer: (l.closer as string) ?? null,
    createdAt: (l.created_at as string) ?? null,
  }));

  const funnel: LeadFunnel = {
    leads: rows.length,
    booked: rows.filter((r) => ["call_gepland", "gekwalificeerd", "closed"].includes(r.stage)).length,
    showed: rows.filter((r) => ["gekwalificeerd", "closed"].includes(r.stage)).length,
    won: rows.filter((r) => r.stage === "closed").length,
    cash: rows.filter((r) => r.stage === "closed").reduce((s, r) => s + r.value, 0),
  };

  const grouped = new Map<string, { source: string; leads: number; won: number; cash: number }>();
  for (const r of rows) {
    const key = r.source || r.sourceLabel?.split(":")[0] || "Onbekend";
    const cur = grouped.get(key) ?? { source: key, leads: 0, won: 0, cash: 0 };
    cur.leads += 1;
    if (r.stage === "closed") {
      cur.won += 1;
      cur.cash += r.value;
    }
    grouped.set(key, cur);
  }

  return { rows, funnel, bySource: [...grouped.values()].sort((a, b) => b.leads - a.leads) };
}

// ── Stories ─────────────────────────────────────────────────────

export interface StorySlide {
  id: string;
  position: number;
  slideType: string | null;
  cta: string | null;
  views: number;
  linkClicks: number;
  replies: number;
  likes: number;
  note: string | null;
}

export interface StorySequence {
  id: string;
  date: string;
  slides: StorySlide[];
}

export interface StoryMonth {
  sequences: StorySequence[];
  totals: { views: number; replies: number; likes: number; slides: number; avgDropOff: number; avgLinkClick: number };
}

export async function getStoryMonth(clientId: string, month: string): Promise<StoryMonth> {
  const empty: StoryMonth = {
    sequences: [],
    totals: { views: 0, replies: 0, likes: 0, slides: 0, avgDropOff: 0, avgLinkClick: 0 },
  };
  if (!live()) return empty;
  const supabase = await createClient();
  if (!supabase) return empty;

  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const { data: seqs } = await supabase
    .from("story_sequences")
    .select("id,seq_date")
    .eq("client_id", clientId)
    .gte("seq_date", from)
    .lte("seq_date", to)
    .order("seq_date", { ascending: false });
  if (!seqs?.length) return empty;

  const { data: slides } = await supabase
    .from("story_slides")
    .select("id,sequence_id,position,slide_type,cta,views,link_clicks,replies,likes,note")
    .in("sequence_id", seqs.map((s) => s.id))
    .order("position");

  const bySeq = new Map<string, StorySlide[]>();
  for (const s of slides ?? []) {
    const arr = bySeq.get(s.sequence_id as string) ?? [];
    arr.push({
      id: s.id as string,
      position: Number(s.position ?? 1),
      slideType: (s.slide_type as string) ?? null,
      cta: (s.cta as string) ?? null,
      views: Number(s.views ?? 0),
      linkClicks: Number(s.link_clicks ?? 0),
      replies: Number(s.replies ?? 0),
      likes: Number(s.likes ?? 0),
      note: (s.note as string) ?? null,
    });
    bySeq.set(s.sequence_id as string, arr);
  }

  const sequences: StorySequence[] = seqs.map((s) => ({
    id: s.id as string,
    date: s.seq_date as string,
    slides: bySeq.get(s.id as string) ?? [],
  }));

  let views = 0;
  let replies = 0;
  let likes = 0;
  let slideCount = 0;
  const dropOffs: number[] = [];
  const linkRates: number[] = [];
  for (const seq of sequences) {
    for (const sl of seq.slides) {
      views += sl.views;
      replies += sl.replies;
      likes += sl.likes;
      slideCount += 1;
      if (sl.views > 0) linkRates.push((sl.linkClicks / sl.views) * 100);
    }
    // Drop-off: hoeveel kijkers vielen af t.o.v. de eerste slide.
    const first = seq.slides[0]?.views ?? 0;
    const last = seq.slides[seq.slides.length - 1]?.views ?? 0;
    if (first > 0 && seq.slides.length > 1) dropOffs.push(((first - last) / first) * 100);
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0);

  return {
    sequences,
    totals: {
      views,
      replies,
      likes,
      slides: slideCount,
      avgDropOff: Math.round(avg(dropOffs) * 10) / 10,
      avgLinkClick: Math.round(avg(linkRates) * 10) / 10,
    },
  };
}

// ── Meetings / calls ────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  startsAt: string;
  duration: number;
  clientId: string | null;
  clientName: string | null;
  attendees: string | null;
  notes: string | null;
  outcome: string | null;
}

export async function getMeetings(opts?: { clientId?: string; fromToday?: boolean; limit?: number }): Promise<Meeting[]> {
  if (!live()) return [];
  const supabase = await createClient();
  if (!supabase) return [];

  let q = supabase
    .from("meetings")
    .select("id,title,starts_at,duration,client_id,attendees,notes,outcome")
    .order("starts_at", { ascending: true })
    .limit(opts?.limit ?? 100);
  if (opts?.clientId) q = q.eq("client_id", opts.clientId);
  if (opts?.fromToday) q = q.gte("starts_at", new Date(new Date().toDateString()).toISOString());

  const [{ data }, { data: clients }] = await Promise.all([q, supabase.from("clients").select("id,name")]);
  const nameById = new Map((clients ?? []).map((c) => [c.id as string, c.name as string]));

  return (data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    startsAt: m.starts_at as string,
    duration: Number(m.duration ?? 30),
    clientId: (m.client_id as string) ?? null,
    clientName: m.client_id ? (nameById.get(m.client_id as string) ?? null) : null,
    attendees: (m.attendees as string) ?? null,
    notes: (m.notes as string) ?? null,
    outcome: (m.outcome as string) ?? null,
  }));
}

// ── EOD ─────────────────────────────────────────────────────────

export interface EodReport {
  id: string;
  userId: string;
  fullName: string | null;
  date: string;
  done: string | null;
  blockers: string | null;
  tomorrow: string | null;
  videos: number;
}

export async function getEodReports(limit = 30): Promise<EodReport[]> {
  if (!live()) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("eod_reports")
    .select("id,user_id,full_name,eod_date,done,blockers,tomorrow,videos")
    .order("eod_date", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    fullName: (r.full_name as string) ?? null,
    date: r.eod_date as string,
    done: (r.done as string) ?? null,
    blockers: (r.blockers as string) ?? null,
    tomorrow: (r.tomorrow as string) ?? null,
    videos: Number(r.videos ?? 0),
  }));
}
