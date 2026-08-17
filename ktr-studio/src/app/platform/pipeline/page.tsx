import Link from "next/link";
import { stageMeta, fmtNum, type PipelineStage } from "../_data";
import { PageHeader, Card, Badge, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getEditors } from "@/lib/editors";
import { AddContentDialog } from "./AddContentDialog";
import { ContentStageControl } from "./ContentStageControl";
import { ClientFilter } from "../ClientFilter";
import { ClientBoard } from "./ClientBoard";
import { getSessionContext } from "@/lib/auth";

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

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ client?: string; view?: string }> }) {
  const sp = await searchParams;
  const [{ content: allContent, clients, demo }, ctx] = await Promise.all([getWorkspaceData(), getSessionContext()]);
  const isClient = ctx.profile?.role === "client";

  // Klant-login: vereenvoudigd, alleen-lezen board (RLS levert al alleen z'n eigen content).
  if (isClient) {
    return (
      <>
        <PageHeader
          eyebrow="Mijn content"
          title="Wat we voor je maken"
          subtitle="Van idee tot live — en wat er nog op jouw akkoord wacht."
        />
        <ClientBoard content={allContent} />
      </>
    );
  }

  const editors = await getEditors();
  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));
  const editorOptions = editors.map((e) => ({ id: e.id, label: e.name }));

  // Klantfilter via ?client=<id> (kaarten dragen de klantnaam).
  const activeClient = clients.find((c) => c.id === sp.client);
  const contentCards = activeClient ? allContent.filter((c) => c.client === activeClient.name) : allContent;

  // Editor-rol: Engelstalige schermteksten (editors zijn vaak Engelstalig).
  // Owner/team kan met ?view=editor precies zien wat een editor ziet,
  // zonder in te loggen op diens account.
  const realEditor = ctx.profile?.role === "editor";
  const previewAsEditor = !realEditor && sp.view === "editor";
  const isEditor = realEditor || previewAsEditor;
  const t = isEditor
    ? {
        eyebrow: "Production",
        title: "Production board",
        subtitle: "Everything in production, per client. Open the files, edit, and drag the card to 'Quality Control' when you're done — Menno gets notified automatically.",
        allLabel: "All clients",
        hints: {
          ideation: "Hooks & concepts",
          ready_for_editing: "Ready for you to edit",
          quality_control: "Delivered — in review",
          revisions_needed: "Changes requested",
          revisions_completed: "Changes done",
          client_approval: "Waiting on client",
          ready_for_posting: "Ready to schedule",
          posted: "Published",
        } as Record<string, string>,
      }
    : {
        eyebrow: "Content pipeline",
        title: "Productieboard",
        subtitle: "Van idee tot live — alle content over je klanten in één board. Vervangt je losse Monday.",
        allLabel: "Alle klanten",
        hints: Object.fromEntries(stageOrder.map((s) => [s, stageMeta[s].hint])) as Record<string, string>,
      };

  // Toggle-links behouden het actieve klantfilter.
  const clientQS = sp.client ? `?client=${sp.client}` : "";
  const editorViewQS = sp.client ? `?client=${sp.client}&view=editor` : "?view=editor";

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        action={
          previewAsEditor ? undefined : realEditor ? undefined : (
            <div className="flex items-center gap-2">
              <Link
                href={`/platform/pipeline${editorViewQS}`}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3.5 py-2.5 text-sm transition-all"
                title="Zie het board precies zoals je editor het ziet"
              >
                👁 Bekijk als editor
              </Link>
              <AddContentDialog clients={clientOptions} editors={editorOptions} />
            </div>
          )
        }
      />

      {previewAsEditor && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-2.5">
          <span className="text-[13px]">
            👁 <strong>Editor-weergave</strong> — dit is precies wat Max ziet (alleen kan zij geen kaarten toevoegen, wel slepen).
          </span>
          <Link href={`/platform/pipeline${clientQS}`} className="shrink-0 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[12px] px-3 py-1.5 transition-colors">
            Terug naar mijn weergave
          </Link>
        </div>
      )}

      <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} allLabel={t.allLabel} />

      {/* Verticaal board: fases als rijen onder elkaar (scrollen i.p.v. zijwaarts) */}
      <div className="space-y-8">
        {stageOrder.map((stage) => {
          const cards = contentCards.filter((c) => c.stage === stage);
          return (
            <section key={stage}>
              {/* Fasekop */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold">{stageMeta[stage].label}</span>
                  <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono">{t.hints[stage]}</span>
              </div>

              {/* Kaarten in een grid; lege fase = compacte lege staat */}
              <div className={cards.length === 0
                ? "rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.05] px-4 py-3"
                : "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5"}>
                {cards.length === 0 && <span className="text-[12px] text-muted">Leeg</span>}
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
                    {card.briefUrl && (
                      <a
                        href={card.briefUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/40 hover:text-accent px-2.5 py-1 text-[11.5px] text-foreground/80 transition-all"
                      >
                        📁 Open files
                      </a>
                    )}
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
                    {!demo && <ContentStageControl contentId={card.id} stage={card.stage} />}
                  </Card>
                ))}

              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
