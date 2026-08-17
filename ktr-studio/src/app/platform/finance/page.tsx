import { PageHeader, Card, Stat, Avatar, Badge, Eyebrow, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { getMoneybirdMonth } from "@/lib/integrations/moneybird";
import { fmtEur } from "../_data";
import { PaymentStatusControl } from "./PaymentStatusControl";
import { ExportButton } from "../ExportButton";

const invoiceStateColor: Record<string, string> = {
  paid: "#34D399",
  open: "#FBBF24",
  pending_payment: "#FBBF24",
  late: "#F87171",
  uncollectible: "#6B7280",
};
const invoiceStateLabel: Record<string, string> = {
  paid: "betaald",
  open: "open",
  pending_payment: "in behandeling",
  late: "te laat",
  uncollectible: "oninbaar",
};

export default async function FinancePage() {
  const [{ clients, demo }, { agency }, moneybird] = await Promise.all([
    getWorkspaceData(),
    getSessionContext(),
    getMoneybirdMonth(),
  ]);
  const billable = clients.filter((c) => c.status !== "gepauzeerd");
  const target = Number(agency?.monthly_target ?? 0);

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
        action={
          <ExportButton
            filename="finance.csv"
            rows={billable.map((c) => ({
              klant: c.name,
              pakket: c.packageName ?? "",
              retainer: c.monthlyValue,
              editor_kosten: c.editorCost,
              marge: c.monthlyValue - c.editorCost,
              betaalstatus: c.paymentStatus,
            }))}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="MRR (retainers)" value={fmtEur(mrr)} delta={demo ? "+€2.200 deze maand" : undefined} icon={icons.money} />
        <Stat label="Editor-kosten" value={fmtEur(editorCosts)} icon={icons.studio} />
        <Stat label="Netto marge" value={fmtEur(margin)} delta={`${marginPct}% marge`} icon={icons.analytics} />
        <Stat label="Nieuw deze maand" value={String(newThisMonth)} icon={icons.clients} />
      </div>

      {/* Maanddoel: hoeveel nog te gaan (doel instellen via Instellingen) */}
      {target > 0 && (
        <Card className="p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-accent">{icons.target}</span>
              <span className="font-display font-bold">Maanddoel {fmtEur(target)}</span>
            </div>
            <span className="text-[13px]">
              {mrr >= target ? (
                <span className="text-emerald-400 font-bold">Doel gehaald 🎉 (+{fmtEur(mrr - target)})</span>
              ) : (
                <>
                  <span className="text-muted">nog </span>
                  <strong className="text-accent">{fmtEur(target - mrr)}</strong>
                  <span className="text-muted"> te gaan · ≈ {Math.ceil((target - mrr) / Math.max(1, mrr / Math.max(1, billable.length)))} klant(en) bij je huidige gem. retainer</span>
                </>
              )}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className={`h-full rounded-full ${mrr >= target ? "bg-emerald-400" : "bg-accent"}`}
              style={{ width: `${Math.min(100, target ? (mrr / target) * 100 : 0)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Moneybird: wat er deze maand écht binnenkomt (facturen, excl. btw) */}
      {!demo && moneybird.configured && (
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <Eyebrow>Moneybird · deze maand</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Wat er binnenkomt</h2>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <span>
                <span className="text-muted text-[12px]">Gefactureerd </span>
                <strong className="font-mono">{fmtEur(moneybird.invoiced)}</strong>
              </span>
              <span>
                <span className="text-muted text-[12px]">Betaald </span>
                <strong className="font-mono text-emerald-400">{fmtEur(moneybird.paid)}</strong>
              </span>
              <span>
                <span className="text-muted text-[12px]">Nog open </span>
                <strong className="font-mono text-amber-300">{fmtEur(moneybird.open)}</strong>
              </span>
              <span>
                <span className="text-muted text-[12px]">Winst na editors </span>
                <strong className="font-mono text-emerald-400">{fmtEur(moneybird.invoiced - editorCosts)}</strong>
              </span>
            </div>
          </div>
          {moneybird.error ? (
            <p className="text-[13px] text-amber-300">{moneybird.error}</p>
          ) : moneybird.invoices.length === 0 ? (
            <p className="text-[13px] text-muted">Nog geen facturen deze maand.</p>
          ) : (
            <div className="space-y-1">
              {moneybird.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{inv.contact}</div>
                    <div className="text-[11px] text-muted">
                      {inv.reference ?? "—"}
                      {inv.dueDate && ` · vervalt ${new Date(inv.dueDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm">{fmtEur(inv.totalExcl)}</span>
                    <Badge color={invoiceStateColor[inv.state] ?? "#6B7280"}>
                      {invoiceStateLabel[inv.state] ?? inv.state}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {!demo && !moneybird.configured && (
        <Card className="p-4 mb-6 border-dashed">
          <p className="text-[13px] text-muted">
            💡 <strong className="text-foreground">Moneybird koppelen?</strong> Zet <code className="text-accent">MONEYBIRD_API_TOKEN</code> en{" "}
            <code className="text-accent">MONEYBIRD_ADMINISTRATION_ID</code> in Vercel — dan zie je hier per klant wat er deze maand
            gefactureerd, betaald en nog open is, plus je winst na editor-kosten.
          </p>
        </Card>
      )}

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
