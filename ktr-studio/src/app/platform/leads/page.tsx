import { leadStageMeta, fmtEur, type LeadStage } from "../_data";
import { PageHeader, Card, Stat, Avatar, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { AddLeadDialog } from "./AddLeadDialog";
import { LeadStageControl } from "./LeadStageControl";
import { FollowupControl } from "./FollowupControl";
import { ExportButton } from "../ExportButton";

const stageOrder: LeadStage[] = ["nieuw", "gekwalificeerd", "call_gepland", "closed", "verloren"];

export default async function Leads() {
  const { leads, clients, content, demo } = await getWorkspaceData();

  const closed = leads.filter((l) => l.stage === "closed");
  const closedValue = closed.reduce((s, l) => s + l.value, 0);
  const pipelineValue = leads
    .filter((l) => l.stage !== "closed" && l.stage !== "verloren")
    .reduce((s, l) => s + l.value, 0);
  const qualified = leads.filter((l) => l.stage !== "nieuw").length;
  const closeRate = qualified ? Math.round((closed.length / qualified) * 100) : 0;

  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));
  const contentOptions = content.map((c) => ({ id: c.id, label: c.title }));

  // Vandaag-of-eerder opvolgen, open leads -> actielijst per setter.
  const today = new Date().toISOString().slice(0, 10);
  const dueFollowups = leads.filter(
    (l) => l.nextFollowup && l.nextFollowup <= today && l.stage !== "closed" && l.stage !== "verloren"
  );

  return (
    <>
      <PageHeader
        eyebrow="Leads & Omzet"
        title="Sales pipeline"
        subtitle="Van eerste contact tot closed deal, gekoppeld aan de content die 'm opleverde — met omzet-attributie."
        action={
          <div className="flex items-center gap-2">
            <ExportButton
              filename="leads.csv"
              rows={leads.map((l) => ({
                naam: l.name,
                klant: l.client,
                bron: l.source,
                fase: l.stage,
                waarde: l.value,
                setter: l.setter,
                datum: l.date,
              }))}
            />
            <AddLeadDialog clients={clientOptions} content={contentOptions} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Closed deze maand" value={fmtEur(closedValue)} delta={`${closed.length} deals`} icon={icons.money} />
        <Stat label="In pipeline" value={fmtEur(pipelineValue)} icon={icons.leads} />
        <Stat label="Close rate" value={`${closeRate}%`} delta={demo ? "+6pt vs. vorige maand" : undefined} icon={icons.check} />
        <Stat label="Nieuwe leads" value={String(leads.filter((l) => l.stage === "nieuw").length)} icon={icons.send} />
      </div>

      {/* Vandaag opvolgen */}
      {dueFollowups.length > 0 && (
        <Card className="p-5 mb-6 border-red-400/30 bg-red-400/[0.04]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-300">⏰</span>
            <span className="font-display font-bold">Vandaag opvolgen ({dueFollowups.length})</span>
          </div>
          <div className="space-y-1.5">
            {dueFollowups.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
                <span className="font-medium">{l.name}</span>
                <span className="text-muted">{l.client}</span>
                {l.setter !== "—" && <span className="text-accent">→ {l.setter}</span>}
                {l.followupNote && <span className="text-muted italic">&ldquo;{l.followupNote}&rdquo;</span>}
                <span className="ml-auto font-mono text-[11px] text-red-300">
                  {new Date(l.nextFollowup!).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sales board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {stageOrder.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          const meta = leadStageMeta[stage];
          const value = items.reduce((s, l) => s + l.value, 0);
          return (
            <div key={stage} className="w-[280px] shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="font-display font-bold text-sm">{meta.label}</span>
                  <span className="font-mono text-[11px] text-muted">{items.length}</span>
                </div>
                <span className="font-mono text-[11px] text-muted">{fmtEur(value)}</span>
              </div>

              <div className="space-y-3 min-h-[100px] rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5">
                {items.map((l) => (
                  <Card key={l.id} hover className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar initials={l.name.replace("@", "").slice(0, 2).toUpperCase()} size={32} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        <div className="text-[11px] text-muted truncate">{l.client}</div>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 mb-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">Bron</div>
                      <div className="text-[12px] text-foreground/80 truncate">{l.source}</div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-muted">{l.setter}</span>
                      <span className="font-mono text-sm" style={{ color: stage === "closed" ? "#34D399" : undefined }}>
                        {fmtEur(l.value)}
                      </span>
                    </div>
                    {!demo && <LeadStageControl leadId={l.id} stage={l.stage} />}
                    {!demo && l.stage !== "closed" && l.stage !== "verloren" && (
                      <FollowupControl leadId={l.id} date={l.nextFollowup ?? null} note={l.followupNote ?? null} />
                    )}
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-[12px] text-muted py-6">Leeg</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[12px] text-muted flex items-center gap-2">
        <span className="text-accent">{icons.spark}</span>
        Voeg leads handmatig toe of laat ze straks automatisch binnenstromen via de ManyChat-koppeling. Zet een lead op &ldquo;Closed&rdquo; en de omzet wordt toegeschreven aan de bron-content.
      </p>
    </>
  );
}
