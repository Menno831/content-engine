import Link from "next/link";
import { stageMeta, type PipelineStage } from "../_data";
import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getEditors } from "@/lib/editors";
import { AddContentDialog } from "./AddContentDialog";
import { QuickAddDialog } from "./QuickAddDialog";
import { ContentCardItem } from "./ContentCardItem";
import { GanttBoard } from "./GanttBoard";
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
  // Productie-formats (migratie 017)
  Longform: "#60A5FA",
  Clip: "#34D399",
  Lifestyle: "#FBBF24",
  "VO story": "#A78BFA",
  Talking: "#F97316",
  Trio: "#F87171",
  // Oude/gesyncte formats
  Reel: "#F97316",
  Carrousel: "#A78BFA",
  Story: "#60A5FA",
  Short: "#34D399",
};

export default async function Pipeline({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; view?: string; all?: string; weergave?: string; format?: string }>;
}) {
  const sp = await searchParams;
  const kanban = sp.weergave === "kanban";
  const gantt = sp.weergave === "gantt";
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

  // Kaarten dragen de editor-naam (voor het board en de editor-weergave).
  const editorNameById = new Map(editors.map((e) => [e.id, e.name]));
  const namedContent = allContent.map((c) =>
    c.editorId ? { ...c, assignee: editorNameById.get(c.editorId) ?? c.assignee } : c
  );

  // Klantfilter via ?client=<id> (kaarten dragen de klantnaam).
  const activeClient = clients.find((c) => c.id === sp.client);
  let contentCards = activeClient ? namedContent.filter((c) => c.client === activeClient.name) : namedContent;

  // Formaatfilter (sub-board): alleen Longform, Clip, Story...
  if (sp.format) contentCards = contentCards.filter((c) => c.format === sp.format);

  // Editor-login met gekoppelde editor: alleen de eigen kaarten — en als
  // de editor aan klant(en) gekoppeld is, alleen de borden van die klanten
  // (toegewezen aan hem/haar, of nog niet toegewezen).
  const ownEditorId = ctx.profile?.role === "editor" ? ctx.profile.editor_id : null;
  if (ownEditorId) {
    const own = editors.find((e) => e.id === ownEditorId);
    const allowedNames = new Set(
      (own?.clientIds ?? []).map((id) => clients.find((c) => c.id === id)?.name).filter(Boolean) as string[]
    );
    contentCards = allowedNames.size
      ? contentCards.filter((c) => allowedNames.has(c.client) && (c.editorId === ownEditorId || !c.editorId))
      : contentCards.filter((c) => c.editorId === ownEditorId);
  }

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

  // Welke formats komen er überhaupt voor — geen lege sub-boards tonen.
  const formatsInUse = [...new Set(allContent.map((c) => c.format).filter(Boolean))].sort();

  // Links bouwen met behoud van de actieve filters.
  const boardHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      client: sp.client,
      view: sp.view,
      all: sp.all,
      weergave: sp.weergave,
      format: sp.format,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/platform/pipeline?${q}` : "/platform/pipeline";
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
              <QuickAddDialog clients={clientOptions} editors={editorOptions} defaultClient={sp.client} />
              <AddContentDialog clients={clientOptions} editors={editorOptions} defaultClient={sp.client} />
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

      {/* Sub-boards per formaat + tabel/kanban-weergave */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex flex-wrap gap-1.5">
          <FilterLink
            href={boardHref({ format: undefined })}
            active={!sp.format}
            label={isEditor ? "All formats" : "Alle formats"}
          />
          {formatsInUse.map((f) => (
            <FilterLink key={f} href={boardHref({ format: sp.format === f ? undefined : f })} active={sp.format === f} label={f} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <FilterLink href={boardHref({ weergave: undefined })} active={!kanban} label="☰ Tabel" />
          <FilterLink href={boardHref({ weergave: "kanban" })} active={kanban} label="▥ Kanban" />
          <FilterLink href={boardHref({ weergave: "gantt" })} active={gantt} label="⇥ Tijdlijn" />
        </div>
      </div>

      {gantt ? (
        <GanttBoard
          cards={contentCards}
          formatColor={formatColor}
          stageLabels={Object.fromEntries(stageOrder.map((st) => [st, stageMeta[st].label]))}
        />
      ) : kanban ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {stageOrder.map((stage) => {
            const all = contentCards.filter((c) => c.stage === stage);
            // Zelfde archief-cap als de tabel: gepost werk blijft beperkt
            // tot de recentste kaarten, anders wordt de kolom eindeloos.
            const cards = stage === "posted" && sp.all !== "1" ? all.slice(0, 15) : all;
            const hiddenCount = all.length - cards.length;
            return (
              <div key={stage} className="w-[300px] shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-display font-bold text-sm">{stageMeta[stage].label}</span>
                  <span className="font-mono text-[11px] text-muted">{all.length}</span>
                </div>
                <div className="space-y-3 min-h-[120px] rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5">
                  {cards.map((card) => (
                    <ContentCardItem
                      key={card.id}
                      card={card}
                      color={formatColor[card.format] ?? "#9CA3AF"}
                      editors={editorOptions}
                      demo={demo}
                      isEditor={isEditor}
                    />
                  ))}
                  {cards.length === 0 && <div className="text-center text-[12px] text-muted py-6">Leeg</div>}
                  {hiddenCount > 0 && (
                    <Link
                      href={boardHref({ all: "1" })}
                      className="block text-center text-[12px] text-muted hover:text-accent py-2 transition-colors"
                    >
                      +{hiddenCount} oudere tonen
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      /* Verticaal board: fases als rijen onder elkaar (scrollen i.p.v. zijwaarts) */
      <div className="space-y-8">
        {stageOrder.map((stage) => {
          let cards = contentCards.filter((c) => c.stage === stage);
          // Posted is het archief: nieuwste eerst, standaard ingeklapt tot 12
          // kaarten — anders wordt het bord eindeloos zodra het archief groeit.
          let hiddenPosted = 0;
          if (stage === "posted") {
            cards = [...cards].sort((a, b) => (b.dateISO ?? "").localeCompare(a.dateISO ?? ""));
            if (sp.all !== "1" && cards.length > 12) {
              hiddenPosted = cards.length - 12;
              cards = cards.slice(0, 12);
            }
          }
          const toggleQS = new URLSearchParams({
            ...(sp.client ? { client: sp.client } : {}),
            ...(sp.view ? { view: sp.view } : {}),
            ...(sp.all === "1" ? {} : { all: "1" }),
          }).toString();
          return (
            <section key={stage}>
              {/* Fasekop */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold">{stageMeta[stage].label}</span>
                  <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">
                    {cards.length + hiddenPosted}
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
                  <ContentCardItem
                    key={card.id}
                    card={card}
                    color={formatColor[card.format] ?? "#9CA3AF"}
                    editors={editorOptions}
                    demo={demo}
                    isEditor={isEditor}
                  />
                ))}

              </div>

              {/* Archief-schakel: alles tonen of weer inklappen */}
              {stage === "posted" && (hiddenPosted > 0 || sp.all === "1") && (
                <div className="mt-3 text-center">
                  <Link
                    href={`/platform/pipeline${toggleQS ? `?${toggleQS}` : ""}`}
                    className="inline-block rounded-full border border-white/[0.08] hover:border-accent/30 hover:text-accent px-4 py-1.5 text-[12.5px] text-muted transition-all"
                  >
                    {sp.all === "1" ? "Show fewer" : `Show all (${cards.length + hiddenPosted})`}
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
      )}
    </>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
        active ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}
