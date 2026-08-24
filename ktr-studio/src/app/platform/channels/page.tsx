import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { ChannelsBoard, type StatRow } from "./ChannelsBoard";
import { AutoSyncCard } from "./AutoSyncCard";
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
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { agency } = await getSessionContext();
      const [{ data: a }, { data, error }] = await Promise.all([
        agency
          ? supabase.from("agencies").select("own_ig_handle, own_yt_channel").eq("id", agency.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("channel_stats")
          .select("id,channel,stat_date,followers,visitors,views,impressions")
          // Nieuwste eerst + limiet: de UI toont ~12 punten per kanaal,
          // dus 400 rijen is ruim; de OUDSTE vallen weg, niet de recente.
          .order("stat_date", { ascending: false })
          .limit(400),
      ]);
      igHandle = (a?.own_ig_handle as string) ?? "";
      ytChannel = (a?.own_yt_channel as string) ?? "";
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
        }));
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Groei"
        title="Eigen kanalen"
        subtitle="Website, Instagram, LinkedIn en YouTube op één scherm — zodat je elke week ziet of je eigen merk groeit."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — kanalen werken in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 027 in Supabase (tabel <code>channel_stats</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <>
          <AutoSyncCard
            igHandle={igHandle}
            ytChannel={ytChannel}
            keys={{
              instagram: Boolean(process.env.RAPIDAPI_KEY),
              youtube: Boolean(process.env.YOUTUBE_API_KEY),
              clarity: Boolean(process.env.CLARITY_API_TOKEN),
            }}
          />
          <ChannelsBoard initial={rows} />
        </>
      )}
    </>
  );
}
