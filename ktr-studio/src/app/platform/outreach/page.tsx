import { redirectEditorToBoard } from "@/lib/guard";
import { todayStr } from "@/lib/dates";
import { PageHeader, Stat, icons } from "../_components";
import { getProspects } from "@/lib/prospects";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { prospectStageMeta, fmtEur, type ProspectStage } from "../_data";
import Link from "next/link";
import { AddProspectDialog } from "./AddProspectDialog";
import { ProspectCard } from "./ProspectCard";

const stageOrder: ProspectStage[] = ["te_contacteren", "dm_verstuurd", "in_gesprek", "audit_verstuurd", "geen_reactie", "afgekeurd"];

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ laag?: string }> }) {
  await redirectEditorToBoard();
  const sp = await searchParams;
  const topOnly = sp.laag === "top";
  const all = await getProspects();
  const topCount = all.filter((p) => p.tier === "top").length;
  // Toplaag-filter; binnen elke kolom staan toplaag-prospects bovenaan.
  const prospects = (topOnly ? all.filter((p) => p.tier === "top") : all).sort(
    (a, b) => Number(b.tier === "top") - Number(a.tier === "top")
  );
  const demo = DEMO_MODE || !isSupabaseConfigured;

  const pipelineValue = prospects
    .filter((p) => p.stage !== "geen_reactie" && p.stage !== "afgekeurd")
    .reduce((s, p) => s + p.potentialValue, 0);
  const inGesprek = prospects.filter((p) => p.stage === "in_gesprek").length;
  const auditSent = prospects.filter((p) => p.stage === "audit_verstuurd").length;

  // Dagteller: DM's die vandaag verstuurd zijn (dm_sent_at van vandaag).
  const today = todayStr();
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

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex gap-1.5">
          <Link
            href="/platform/outreach"
            className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
              !topOnly ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
            }`}
          >
            Alle ({all.length})
          </Link>
          <Link
            href="/platform/outreach?laag=top"
            className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
              topOnly ? "bg-amber-400 text-background font-bold" : "border border-white/[0.08] text-muted hover:border-amber-400/40 hover:text-amber-300"
            }`}
          >
            ★ Toplaag ({topCount})
          </Link>
        </div>
        <p className="text-[11.5px] text-muted">★ op een kaart = persoonlijke aanpak in plaats van de standaard-opener</p>
      </div>

      {topOnly && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 mb-5">
          <div className="font-display font-extrabold mb-2">Het toplaag-playbook (zoals Seth en Jack het bij jou deden)</div>
          <ol className="space-y-1 text-[13px] text-foreground/85 list-decimal list-inside">
            <li><strong>Kijk eerst echt.</strong> Tien minuten hun YouTube en reels — vind het ene ding dat opvalt.</li>
            <li><strong>Opener = oprechte vraag</strong> over dat ene ding. Geen pitch, geen cijfers over hun kanaal.</li>
            <li><strong>Bij antwoord: voice notes.</strong> Tekst voelt als outreach, een voice note voelt als een mens.</li>
            <li><strong>De case in één bijzin:</strong> hoe we een klant van 12K naar 80K per maand brachten. Niet als slide.</li>
            <li><strong>Interesse? Zelfde dag de call boeken.</strong> Vraag hun mail en zet hem meteen klaar.</li>
          </ol>
        </div>
      )}

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
