import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { ChannelsBoard, type StatRow } from "./ChannelsBoard";
import { AutoSyncCard } from "./AutoSyncCard";
import { AnalysisCard } from "./AnalysisCard";
import { WebsiteCard, type SiteCheckRow } from "./WebsiteCard";
import { getSessionContext } from "@/lib/auth";

// Eigen kanalen: website, Instagram, LinkedIn en YouTube van Menno
// zelf — los van de klanten. Handmatige snapshots, sync waar mogelijk.
export default async function ChannelsPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;

  let rows: StatRow[] = [];
  let migrationMissing = false;
  let igHandle = "";
  let ytChannel = "";
  let website = "";
  let insight: { body: string; createdAt: string } | null = null;
  let siteCheck: SiteCheckRow | null = null;
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { agency } = await getSessionContext();
      const [{ data: a }, { data, error }, { data: ins }, { data: sc }] = await Promise.all([
        agency
          ? supabase.from("agencies").select("own_ig_handle, own_yt_channel, own_website").eq("id", agency.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("channel_stats")
          .select("id,channel,stat_date,followers,visitors,views,impressions,videos,likes,comments,avg_views,top_title,top_views,top_url")
          // Nieuwste eerst + limiet: de UI toont ~12 punten per kanaal,
          // dus 400 rijen is ruim; de OUDSTE vallen weg, niet de recente.
          .order("stat_date", { ascending: false })
          .limit(400),
        supabase.from("channel_insights").select("body,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("site_checks").select("url,ok,status,ms,title,description,issues,checked_at").order("checked_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      igHandle = (a?.own_ig_handle as string) ?? "";
      ytChannel = (a?.own_yt_channel as string) ?? "";
      website = (a?.own_website as string) ?? "";
      if (ins) insight = { body: ins.body as string, createdAt: ins.created_at as string };
      if (sc) {
        siteCheck = {
          url: sc.url as string, ok: Boolean(sc.ok), status: (sc.status as number) ?? null, ms: (sc.ms as number) ?? null,
          title: (sc.title as string) ?? null, description: (sc.description as string) ?? null,
          issues: (sc.issues as string[] | null) ?? [], checkedAt: sc.checked_at as string,
        };
      }
      if (error) migrationMissing = true;
      else {
        rows = (data ?? []).map((r) => ({
          id: r.id as string,
          channel: r.channel as string,
          date: r.stat_date as string,
          followers: r.followers == null ? null : Number(r.followers),
          visitors: r.visitors == null ? null : Number(r.visitors),
          views: r.views == null ? null : Number(r.views),
          impressions: r.impressions == null ? null : Number(r.impressions),
          videos: r.videos == null ? null : Number(r.videos),
          likes: r.likes == null ? null : Number(r.likes),
          comments: r.comments == null ? null : Number(r.comments),
          avgViews: r.avg_views == null ? null : Number(r.avg_views),
          topTitle: (r.top_title as string) ?? null,
          topViews: r.top_views == null ? null : Number(r.top_views),
          topUrl: (r.top_url as string) ?? null,
        }));
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Groei"
        title="Eigen kanalen"
        subtitle="Website, Instagram, LinkedIn en YouTube op één scherm — met een analyse die zegt wat er als eerste gefixt moet worden."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — kanalen werken in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 027 in Supabase (tabel <code>channel_stats</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <>
          <AnalysisCard body={insight?.body ?? null} createdAt={insight?.createdAt ?? null} />
          <AutoSyncCard
            igHandle={igHandle}
            ytChannel={ytChannel}
            website={website}
            keys={{
              instagram: Boolean(process.env.RAPIDAPI_KEY),
              youtube: Boolean(process.env.YOUTUBE_API_KEY),
              clarity: Boolean(process.env.CLARITY_API_TOKEN),
            }}
          />
          <WebsiteCard check={siteCheck} website={website} />
          <ChannelsBoard initial={rows} />
        </>
      )}
    </>
  );
}
