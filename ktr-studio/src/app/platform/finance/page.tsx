import { PageHeader, Card, Stat, Avatar, Badge, Eyebrow, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { fmtEur } from "../_data";
import { PaymentStatusControl } from "./PaymentStatusControl";

export default async function FinancePage() {
  const { clients, demo } = await getWorkspaceData();
  const billable = clients.filter((c) => c.status !== "gepauzeerd");

  const mrr = billable.reduce((s, c) => s + c.monthlyValue, 0);
  const editorCosts = billable.reduce((s, c) => s + c.editorCost, 0);
  const margin = mrr - editorCosts;
  const marginPct = mrr ? Math.round((margin / mrr) * 100) : 0;
  const newThisMonth = clients.filter((c) => c.createdThisMonth).length;

  // Per pakket samenvatten.
  const byPackage = new Map<string, { count: number; mrr: number; margin: number }>();
  for (const c of billable) {
    const key = c.packageName || "Geen pakket";
    const cur = byPackage.get(key) ?? { count: 0, mrr: 0, margin: 0 };
    cur.count += 1;
    cur.mrr += c.monthlyValue;
    cur.margin += c.monthlyValue - c.editorCost;
    byPackage.set(key, cur);
  }

  const sorted = [...billable].sort((a, b) => b.monthlyValue - b.editorCost - (a.monthlyValue - a.editorCost));

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Winst per klant"
        subtitle="Retainer, editor-kosten en netto marge per klant — plus wat er deze maand bijkwam en wie nog moet betalen."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="MRR (retainers)" value={fmtEur(mrr)} delta={demo ? "+€2.200 deze maand" : undefined} icon={icons.money} />
        <Stat label="Editor-kosten" value={fmtEur(editorCosts)} icon={icons.studio} />
        <Stat label="Netto marge" value={fmtEur(margin)} delta={`${marginPct}% marge`} icon={icons.analytics} />
        <Stat label="Nieuw deze maand" value={String(newThisMonth)} icon={icons.clients} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Per klant */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="font-display font-extrabold text-xl mb-5">Per klant</h2>
          <div className="space-y-1">
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted">
              <span className="col-span-4">Klant</span>
              <span className="col-span-2 text-right">Retainer</span>
              <span className="col-span-2 text-right">Editor</span>
              <span className="col-span-2 text-right">Marge</span>
              <span className="col-span-2 text-right">Betaling</span>
            </div>
            {sorted.map((c) => {
              const m = c.monthlyValue - c.editorCost;
              return (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-12 md:col-span-4 flex items-center gap-2.5">
                    <Avatar initials={c.initials} size={30} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-muted">{c.packageName ?? "—"}</div>
                    </div>
                  </div>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm">{fmtEur(c.monthlyValue)}</span>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm text-muted">{fmtEur(c.editorCost)}</span>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm text-emerald-400">{fmtEur(m)}</span>
                  <div className="col-span-12 md:col-span-2 flex md:justify-end">
                    {demo ? (
                      <Badge color={c.paymentStatus === "betaald" ? "#34D399" : c.paymentStatus === "te_laat" ? "#F87171" : "#FBBF24"}>
                        {c.paymentStatus === "te_laat" ? "te laat" : c.paymentStatus}
                      </Badge>
                    ) : (
                      <PaymentStatusControl clientId={c.id} status={c.paymentStatus} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Per pakket */}
        <Card className="p-6">
          <Eyebrow>Per pakket</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-5">Pakketten</h2>
          <div className="space-y-4">
            {[...byPackage.entries()].map(([name, p]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted text-[12px]">{p.count}×</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted">MRR {fmtEur(p.mrr)}</span>
                  <span className="text-emerald-400">marge {fmtEur(p.margin)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${mrr ? (p.mrr / mrr) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
