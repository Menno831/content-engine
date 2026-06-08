import { PageHeader } from "../_components";
import { discoverItems } from "../_data";
import { DiscoverGrid } from "./DiscoverGrid";

export default function DiscoverPage() {
  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Swipe-file"
        subtitle="Best presterende content per niche als inspiratie. Bewaar wat aanspreekt op een board en zet het om in eigen content."
      />
      <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-[12px] text-muted">
        Voorbeeld-feed. Later koppelbaar aan een live bron (trending Reels/Shorts per niche).
      </div>
      <DiscoverGrid items={discoverItems} />
    </>
  );
}
