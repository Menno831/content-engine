import { Card, Badge, icons } from "../_components";
import { fmtNum, type ContentCard } from "../_data";

// Vereenvoudigd, alleen-lezen productieboard voor klant-logins.
// Drie begrijpelijke kolommen i.p.v. de 8 interne productie-fases.
const COLS: { key: string; label: string; hint: string; color: string; match: (c: ContentCard) => boolean }[] = [
  {
    key: "productie",
    label: "In productie",
    hint: "Wij zijn ermee bezig",
    color: "#FB923C",
    match: (c) => c.stage !== "posted" && c.stage !== "client_approval",
  },
  {
    key: "akkoord",
    label: "Wacht op jouw akkoord",
    hint: "Bekijk & keur goed",
    color: "#60A5FA",
    match: (c) => c.stage === "client_approval",
  },
  {
    key: "live",
    label: "Live",
    hint: "Gepubliceerd",
    color: "#22C55E",
    match: (c) => c.stage === "posted",
  },
];

const formatColor: Record<string, string> = {
  Reel: "#F97316",
  Carrousel: "#A78BFA",
  Story: "#60A5FA",
  Short: "#34D399",
};

export function ClientBoard({ content }: { content: ContentCard[] }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {COLS.map((col) => {
        const cards = content.filter(col.match);
        return (
          <div key={col.key}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="font-display font-bold text-sm">{col.label}</span>
                <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
            </div>
            <div className="space-y-3 min-h-[120px] rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5">
              {cards.length === 0 ? (
                <p className="text-center text-[12px] text-muted py-6">{col.hint}</p>
              ) : (
                cards.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <Badge color={formatColor[card.format] ?? "#888"}>{card.format}</Badge>
                      {card.stage === "posted" && card.permalink && (
                        <a href={card.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover">
                          <span className="w-3.5 h-3.5">{icons.eye}</span> {fmtNum(card.views ?? 0)}
                        </a>
                      )}
                    </div>
                    <h3 className="font-medium text-sm leading-snug mb-1.5">{card.title}</h3>
                    {card.hook && <p className="text-[12px] text-muted leading-relaxed line-clamp-2">&ldquo;{card.hook}&rdquo;</p>}
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
