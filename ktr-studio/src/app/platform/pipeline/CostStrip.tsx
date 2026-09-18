// Wat er nu in productie staat en wat dat kost. Telt alleen kaarten die
// nog niet gepost zijn — dat is het bedrag dat er nog uit moet. Kaarten
// zonder prijs worden apart geteld in plaats van als nul meegerekend,
// anders lijkt je marge beter dan hij is.
import Link from "next/link";
import type { ContentCard } from "../_data";

const eur = (n: number) => `€${n.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;

export function CostStrip({ cards }: { cards: ContentCard[] }) {
  const open = cards.filter((c) => c.stage !== "posted");
  if (open.length === 0) return null;

  const cost = open.reduce((s, c) => s + (c.costPrice ?? 0), 0);
  const sell = open.reduce((s, c) => s + (c.sellPrice ?? 0), 0);
  const priced = open.filter((c) => c.costPrice != null || c.sellPrice != null).length;
  const margin = sell - cost;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.07] bg-card px-5 py-3.5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted">In productie</div>
        <div className="font-display font-extrabold text-xl tabular-nums leading-none">{open.length}</div>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted">Kost je</div>
        <div className="font-display font-extrabold text-xl tabular-nums leading-none">{eur(cost)}</div>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted">Levert op</div>
        <div className="font-display font-extrabold text-xl tabular-nums leading-none">{eur(sell)}</div>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted">Marge</div>
        <div className={`font-display font-extrabold text-xl tabular-nums leading-none ${margin < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {eur(margin)}
        </div>
      </div>

      {priced < open.length && (
        <span className="ml-auto text-[12px] text-muted">
          {open.length - priced} van {open.length} kaarten nog zonder prijs — die tellen niet mee
        </span>
      )}
      {priced === open.length && (
        <Link href="/platform/editors" className="ml-auto text-[12px] text-muted hover:text-accent transition-colors">
          Uitbetalingen per editor →
        </Link>
      )}
    </div>
  );
}
