import { PageHeader } from "../_components";
import { discoverItems } from "../_data";
import { DiscoverGrid } from "./DiscoverGrid";
import { CompetitorBoard } from "./CompetitorBoard";
import { getCompetitorFeed } from "@/lib/competitors";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";

export default async function DiscoverPage() {
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const { competitors, posts } = await getCompetitorFeed();

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Competitors & outliers"
        subtitle="Volg de accounts in jouw niches — wij syncen hun content en markeren automatisch de outliers, zodat je nooit een winnend format mist."
      />
      {demo ? (
        <>
          <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-[12px] text-muted">
            Voorbeeld-feed (demo). In de echte omgeving volg je hier competitors en zie je hun outliers.
          </div>
          <DiscoverGrid items={discoverItems} />
        </>
      ) : (
        <CompetitorBoard competitors={competitors} posts={posts} />
      )}
    </>
  );
}
