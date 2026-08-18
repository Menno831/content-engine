import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader, Stat, icons } from "../_components";
import { getProspects } from "@/lib/prospects";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { prospectStageMeta, fmtEur, type ProspectStage } from "../_data";
import { AddProspectDialog } from "./AddProspectDialog";
import { ProspectCard } from "./ProspectCard";

const stageOrder: ProspectStage[] = ["te_contacteren", "dm_verstuurd", "in_gesprek", "audit_verstuurd", "geen_reactie"];

export default async function OutreachPage() {
  await redirectEditorToBoard();
  const prospects = await getProspects();
  const demo = DEMO_MODE || !isSupabaseConfigured;

  const pipelineValue = prospects
    .filter((p) => p.stage !== "geen_reactie")
    .reduce((s, p) => s + p.potentialValue, 0);
  const inGesprek = prospects.filter((p) => p.stage === "in_gesprek").length;
  const auditSent = prospects.filter((p) => p.stage === "audit_verstuurd").length;

  // Dagteller: DM's die vandaag verstuurd zijn (dm_sent_at van vandaag).
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = prospects.filter((p) => (p.dmSentAt ?? "").slice(0, 10) === today).length;

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Nieuwe klanten werven"
        subtitle="Je acquisitie-pijplijn: van prospect tot audit. Houd bij wie je benadert, wie reageert en wat het oplevert."
        action={<AddProspectDialog />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="Vandaag verstuurd" value={String(sentToday)} icon={icons.send} />
        <Stat label="Prospects" value={String(prospects.length)} icon={icons.leads} />
        <Stat label="Potentiële waarde" value={fmtEur(pipelineValue)} icon={icons.money} />
        <Stat label="In gesprek" value={String(inGesprek)} icon={icons.send} />
        <Stat label="Audit verstuurd" value={String(auditSent)} icon={icons.check} />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {stageOrder.map((stage) => {
          const items = prospects.filter((p) => p.stage === stage);
          const meta = prospectStageMeta[stage];
          const value = items.reduce((s, p) => s + p.potentialValue, 0);
          return (
            <div key={stage} className="w-[290px] shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="font-display font-bold text-sm">{meta.label}</span>
                  <span className="font-mono text-[11px] text-muted">{items.length}</span>
                </div>
                <span className="font-mono text-[11px] text-muted">{fmtEur(value)}</span>
              </div>

              <div className="space-y-3 min-h-[100px] rounded-2xl bg-white/[0.015] border border-white/[0.04] p-2.5">
                {items.map((p) => (
                  <ProspectCard key={p.id} prospect={p} demo={demo} />
                ))}
                {items.length === 0 && <div className="text-center text-[12px] text-muted py-6">Leeg</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
