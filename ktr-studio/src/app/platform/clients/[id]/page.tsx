import Link from "next/link";
import { getClient, getWorkspaceData } from "@/lib/data";
import { getEditors } from "@/lib/editors";
import { stageMeta, type PipelineStage } from "../../_data";
import { Card } from "../../_components";
import { ContentCardItem } from "../../pipeline/ContentCardItem";
import { AddContentDialog } from "../../pipeline/AddContentDialog";
import { QuickAddDialog } from "../../pipeline/QuickAddDialog";

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
  Longform: "#60A5FA",
  Clip: "#34D399",
  Lifestyle: "#FBBF24",
  "VO story": "#A78BFA",
  Talking: "#F97316",
  Trio: "#F87171",
  Reel: "#F97316",
  Short: "#34D399",
};

// Pipeline-tab: het productieboard van deze ene klant.
export default async function ClientPipeline({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ all?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [c, { content, clients, demo }, editors] = await Promise.all([
    getClient(id),
    getWorkspaceData(),
    getEditors(),
  ]);
  if (!c) return null;

  const editorOptions = editors.map((e) => ({ id: e.id, label: e.name }));
  const clientOptions = clients.map((x) => ({ id: x.id, label: x.name }));
  const editorNameById = new Map(editors.map((e) => [e.id, e.name]));
  const mine = content
    .filter((x) => x.client === c.name)
    .map((x) => (x.editorId ? { ...x, assignee: editorNameById.get(x.editorId) ?? x.assignee } : x));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-[13px] text-muted">
          {mine.length} kaart{mine.length === 1 ? "" : "en"} voor {c.name} — van idee tot live.
        </p>
        <div className="flex items-center gap-2">
          <QuickAddDialog clients={clientOptions} editors={editorOptions} defaultClient={c.id} />
          <AddContentDialog clients={clientOptions} editors={editorOptions} defaultClient={c.id} />
        </div>
      </div>

      <div className="space-y-8">
        {stageOrder.map((stage) => {
          let cards = mine.filter((x) => x.stage === stage);
          let hidden = 0;
          if (stage === "posted") {
            cards = [...cards].sort((a, b) => (b.dateISO ?? "").localeCompare(a.dateISO ?? ""));
            if (sp.all !== "1" && cards.length > 8) {
              hidden = cards.length - 8;
              cards = cards.slice(0, 8);
            }
          }
          return (
            <section key={stage}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold">{stageMeta[stage].label}</span>
                  <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">
                    {cards.length + hidden}
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono">{stageMeta[stage].hint}</span>
              </div>
              <div
                className={
                  cards.length === 0
                    ? "rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.05] px-4 py-3"
                    : "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5"
                }
              >
                {cards.length === 0 && <span className="text-[12px] text-muted">Leeg</span>}
                {cards.map((card) => (
                  <ContentCardItem
                    key={card.id}
                    card={card}
                    color={formatColor[card.format] ?? "#9CA3AF"}
                    editors={editorOptions}
                    demo={demo}
                    isEditor={false}
                  />
                ))}
              </div>
              {hidden > 0 && (
                <Link
                  href={`/platform/clients/${id}?all=1`}
                  className="inline-block mt-2 text-[12px] text-muted hover:text-accent transition-colors"
                >
                  + {hidden} ouder{hidden === 1 ? "e" : "e"} posts tonen
                </Link>
              )}
            </section>
          );
        })}
      </div>

      {mine.length === 0 && (
        <Card className="p-10 text-center border-dashed mt-4">
          <p className="text-muted text-sm">Nog geen content voor deze klant — voeg er hierboven een toe.</p>
        </Card>
      )}
    </>
  );
}
