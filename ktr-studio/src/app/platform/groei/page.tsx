import Link from "next/link";
import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader, Card, Eyebrow, Badge } from "../_components";
import { fmtEur } from "../_data";
import { buildGrowthPlan } from "@/lib/growth";

const prioMeta: Record<number, { label: string; color: string }> = {
  1: { label: "Nu doen", color: "#F87171" },
  2: { label: "Deze week", color: "#FBBF24" },
  3: { label: "Kan wachten", color: "#6B7280" },
};

// Groeiplan: het doel, waar je staat, en wat de data zegt dat de
// volgende stappen zijn. Elke ochtend anders, want de cijfers zijn anders.
export default async function GroeiPage() {
  await redirectEditorToBoard();
  const plan = await buildGrowthPlan();

  if (!plan) {
    return (
      <>
        <PageHeader eyebrow="Groei" title="Groeiplan" subtitle="Het doel, waar je staat en wat er nu moet gebeuren." />
        <p className="text-sm text-muted">Demo-modus — het groeiplan rekent met echte data in de echte omgeving.</p>
      </>
    );
  }

  const pct = Math.min(100, Math.round((plan.mrr / plan.goal) * 100));

  return (
    <>
      <PageHeader
        eyebrow="Groei"
        title={`Op weg naar ${fmtEur(plan.goal)}/mnd`}
        subtitle="Automatisch opgebouwd uit je échte cijfers: retainers, leads, outreach, levering en facturen. Elke dag opnieuw berekend."
      />

      {/* Doelmeter */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <Eyebrow>Maandelijkse retainer (MRR)</Eyebrow>
            <div className="font-display font-extrabold text-4xl">
              {fmtEur(plan.mrr)}
              <span className="text-muted text-xl font-bold"> / {fmtEur(plan.goal)}</span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Gefactureerd deze mnd</div>
              <div className="font-display font-extrabold text-xl">{fmtEur(plan.invoicedThisMonth)}</div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Waarvan betaald</div>
              <div className="font-display font-extrabold text-xl text-emerald-400">{fmtEur(plan.paidThisMonth)}</div>
            </div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-[12px] text-muted">
          <span>{pct}% van het doel</span>
          {plan.gap > 0 && plan.clientsNeeded != null && (
            <span>
              Nog {fmtEur(plan.gap)}/mnd te gaan ≈ {plan.clientsNeeded} klanten bij gemiddeld {fmtEur(plan.avgRetainer)}
            </span>
          )}
          {plan.gap === 0 && <span className="text-emerald-400">Doel gehaald — tijd voor een nieuw doel 🎉</span>}
        </div>
      </Card>

      {/* Next steps */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display font-extrabold text-xl">Volgende stappen</h2>
        <span className="text-[12px] text-muted">{plan.actions.length} acties uit de data</span>
      </div>

      {plan.actions.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            Alles loopt: geen achterstallige follow-ups, geen late facturen, outreach op tempo. Focus op leveren en
            documenteer wat werkt.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {plan.actions.map((a, i) => {
            const meta = prioMeta[a.priority];
            return (
              <Card key={i} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color={meta.color}>{meta.label}</Badge>
                      <span className="font-medium">{a.title}</span>
                    </div>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed">{a.why}</p>
                  </div>
                  <Link
                    href={a.href}
                    className="shrink-0 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-2 text-[13px] text-muted transition-all"
                  >
                    {a.linkLabel} →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[11.5px] text-muted">
        Hoe dit werkt: het plan kijkt naar je MRR-gat, outreach-tempo (doel 25 DM&apos;s/week), follow-ups, late
        facturen, deadlines, klant-health, aflopende contracten en je eigen kanalen — en zet het urgentste bovenaan.
      </p>
    </>
  );
}
