import { stageMeta, fmtNum, type PipelineStage } from "../_data";
import { PageHeader, Card, Badge, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";

const stageOrder: PipelineStage[] = [
  "ideation",
  "ready_for_editing",
  "quality_control",
  "revisions_needed",
  "revisions_completed",
  "client_approval",
  "ready_for_posting",
  "posted",
];

const formatColor: Record<string, string> = {
  Reel: "#F97316",
  Carrousel: "#A78BFA",
  Story: "#60A5FA",
  Short: "#34D399",
};

export default async function Pipeline() {
  const { content: contentCards } = await getWorkspaceData();
  return (
    <>
      <PageHeader
        eyebrow="Content pipeline"
        title="Productieboard"
        subtitle="Van idee tot live — alle content over je klanten in één board. Vervangt je losse Monday/Trello."
        action={
          <button className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors">
            {icons.plus} Kaart toevoegen
          </button>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {stageOrder.map((stage) => {
          const cards = contentCards.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="w-[300px] shrink-0">
              {/* Kolomkop */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm">{stageMeta[stage].label}</span>
                  <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono">{stageMeta[stage].hint}</span>
              </div>

              {/* Kaarten */}
              <div className="space-y-3 min-h-[120px] rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5">
                {cards.map((card) => (
                  <Card key={card.id} hover className="p-4 cursor-grab active:cursor-grabbing">
                    <div className="flex items-center justify-between mb-2.5">
                      <Badge color={formatColor[card.format]}>{card.format}</Badge>
                      <span className="font-mono text-[10px] text-muted">{card.due}</span>
                    </div>
                    <h3 className="font-medium text-sm leading-snug mb-2">{card.title}</h3>
                    <p className="text-[12px] text-muted leading-relaxed mb-3 line-clamp-2">
                      &ldquo;{card.hook}&rdquo;
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <span className="text-[11px] text-muted truncate max-w-[120px]">{card.client}</span>
                      {card.stage === "posted" ? (
                        <div className="flex items-center gap-2.5 text-[11px]">
                          {card.permalink ? (
                            <a
                              href={card.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:text-accent-hover"
                              title="Open reel op Instagram"
                            >
                              <span className="w-3.5 h-3.5">{icons.eye}</span>
                              {fmtNum(card.views ?? 0)}
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-muted">
                              <span className="w-3.5 h-3.5">{icons.eye}</span>
                              {fmtNum(card.views ?? 0)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-emerald-400">
                            {card.leads ?? 0} leads
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            card.assignee === "AI"
                              ? "bg-accent/15 text-accent border border-accent/25"
                              : "bg-white/[0.05] text-muted"
                          }`}
                        >
                          {card.assignee === "AI" ? "✦ AI" : card.assignee}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}

                <button className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] hover:border-accent/30 hover:text-accent text-muted py-2.5 text-[13px] transition-all">
                  {icons.plus} Toevoegen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
