import { PageHeader } from "../_components";
import { discoverItems } from "../_data";
import { DiscoverGrid } from "./DiscoverGrid";
import { CompetitorBoard } from "./CompetitorBoard";
import { FeedBoard, type FeedItem } from "./FeedBoard";
import { getCompetitorFeed } from "@/lib/competitors";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";

// De "Scan nu"-knop draait YouTube-calls + AI-samenvattingen — geef 'm lucht.
export const maxDuration = 150;

export default async function DiscoverPage() {
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const { competitors, posts } = await getCompetitorFeed();

  // Ochtendscan-items (laatste 5 dagen; ouder ruimt zichzelf visueel op)
  let feedItems: FeedItem[] = [];
  let feedChannels = "";
  let feedTopics = "";
  if (!demo) {
    const supabase = await supabaseServer();
    if (supabase) {
      const since = new Date(Date.now() - 5 * 86_400_000).toISOString();
      const [itemsRes, agRes] = await Promise.all([
        supabase.from("feed_items").select("id,title,channel,url,views,outlier,category,summary,note").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
        supabase.from("agencies").select("feed_channels, feed_topics").limit(1).maybeSingle(),
      ]);
      feedItems = (itemsRes.data ?? []).map((r) => ({
        id: String(r.id),
        title: String(r.title),
        channel: r.channel ?? null,
        url: String(r.url),
        views: Number(r.views ?? 0),
        outlier: r.outlier != null ? Number(r.outlier) : null,
        category: String(r.category),
        summary: r.summary ?? null,
        note: r.note ?? null,
      }));
      feedChannels = String(agRes.data?.feed_channels ?? "");
      feedTopics = String(agRes.data?.feed_topics ?? "");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Competitors & outliers"
        subtitle="Elke ochtend verse video's uit je volglijst en onderwerpen, plus de competitors die we voor je syncen — leen het format, niet de hype."
      />
      {demo ? (
        <>
          <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-[12px] text-muted">
            Voorbeeld-feed (demo). In de echte omgeving volg je hier competitors en zie je hun outliers.
          </div>
          <DiscoverGrid items={discoverItems} />
        </>
      ) : (
        <>
          <FeedBoard items={feedItems} channels={feedChannels} topics={feedTopics} />
          <CompetitorBoard competitors={competitors} posts={posts} />
        </>
      )}
    </>
  );
}
