import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader, Card, Stat, Avatar, Badge, Eyebrow, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { getMoneybirdMonth, getMoneybirdDrafts, getMoneybirdMutations } from "@/lib/integrations/moneybird";
import { OutlookCard, type OutlookMonth } from "./OutlookCard";
import { ReservesCard, type ReserveConfig } from "./ReservesCard";
import { ExpenseTriage } from "./ExpenseTriage";
import { fmtEur } from "../_data";
import { PaymentStatusControl } from "./PaymentStatusControl";
import { ExportButton } from "../ExportButton";
import { InvoiceCost } from "./InvoiceCost";
import { FixedCosts, type FixedCostRow } from "./FixedCosts";
import { OtherIncome, type IncomeRow } from "./OtherIncome";
import { ClientFinanceDialog } from "./ClientFinanceDialog";
import type { CostLine } from "./actions";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

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

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ maand?: string }> }) {
  await redirectEditorToBoard();
  const sp = await searchParams;

  // Maandkeuze: chips vanaf januari 2026 t/m nu; zonder ?maand = deze maand.
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const months: string[] = [];
  for (let d = new Date(2026, 0, 1); d <= now; d.setMonth(d.getMonth() + 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const maand = sp.maand && /^\d{4}-\d{2}$/.test(sp.maand) ? sp.maand : thisMonth;
  const maandLabel = new Date(`${maand}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const isCurrentMonth = maand === thisMonth;

  // Alle maanden in één keer (Moneybird cachet per maand 10 min) voor de
  // maandvergelijking: gaan we er elke maand op vooruit?
  const [{ clients, demo }, { agency }, drafts, bank, ...allMonths] = await Promise.all([
    getWorkspaceData(),
    getSessionContext(),
    getMoneybirdDrafts(),
    getMoneybirdMutations(45),
    ...months.map((m) => getMoneybirdMonth(m === thisMonth ? undefined : m)),
  ]);
  const byMonth = new Map(months.map((m, i) => [m, allMonths[i]]));
  const moneybird = byMonth.get(maand) ?? allMonths[allMonths.length - 1];

  // Kosten per factuur (alle maanden), vaste lasten en overige inkomsten.
  const supabase = await supabaseServer();
  let invoiceCostById = new Map<string, number>();
  let breakdownById = new Map<string, CostLine[] | null>();
  let fixedCosts: FixedCostRow[] = [];
  let incomeByMonth = new Map<string, IncomeRow[]>();
  if (supabase && !demo) {
    const allIds = allMonths.flatMap((mo) => mo.invoices.map((i) => i.id));
    const [costsRes, fixedRes, incomeRes] = await Promise.all([
      allIds.length
        ? supabase.from("invoice_costs").select("id,cost,breakdown").in("id", allIds)
        : Promise.resolve({ data: [] as { id: string; cost: number; breakdown: CostLine[] | null }[] }),
      supabase.from("fixed_costs").select("id,name,amount").order("created_at"),
      supabase.from("other_income").select("id,month,label,amount").order("created_at"),
    ]);
    invoiceCostById = new Map((costsRes.data ?? []).map((r) => [String(r.id), Number(r.cost ?? 0)]));
    breakdownById = new Map((costsRes.data ?? []).map((r) => [String(r.id), (r.breakdown as CostLine[] | null) ?? null]));
    fixedCosts = ((fixedRes.data ?? []) as { id: string; name: string; amount: number }[]).map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount ?? 0) }));
    for (const r of incomeRes.data ?? []) {
      const key = String(r.month).slice(0, 7);
      const arr = incomeByMonth.get(key) ?? [];
      arr.push({ id: r.id, label: r.label, amount: Number(r.amount ?? 0) });
      incomeByMonth.set(key, arr);
    }
  }
  // Maanddoelen, gelabelde uitgaven en potjes-percentages.
  let goalByMonth = new Map<string, { goal: number; note: string | null }>();
  let linkedIds = new Set<string>();
  let expenseTotals: { kind: string; total: number }[] = [];
  let reserveConfig: ReserveConfig | null = null;
  if (supabase && !demo) {
    const [goalsRes, linksRes, agRes] = await Promise.all([
      supabase.from("month_goals").select("month,goal,note"),
      supabase.from("expense_links").select("id,kind,amount,mutation_date"),
      supabase.from("agencies").select("reserve_config").limit(1).maybeSingle(),
    ]);
    goalByMonth = new Map((goalsRes.data ?? []).map((g) => [String(g.month), { goal: Number(g.goal ?? 0), note: g.note ?? null }]));
    linkedIds = new Set((linksRes.data ?? []).map((l) => String(l.id)));
    const totalsMap = new Map<string, number>();
    for (const l of linksRes.data ?? []) {
      if (String(l.mutation_date ?? "").slice(0, 7) !== thisMonth) continue;
      totalsMap.set(String(l.kind), (totalsMap.get(String(l.kind)) ?? 0) + Number(l.amount ?? 0));
    }
    expenseTotals = [...totalsMap.entries()].map(([kind, total]) => ({ kind, total }));
    reserveConfig = (agRes.data?.reserve_config as ReserveConfig | null) ?? null;
  }

  const fixedTotal = fixedCosts.reduce((s, r) => s + r.amount, 0);

  // Winst per maand: gefactureerd + overig − factuurkosten − vaste lasten.
  const profitOf = (m: string) => {
    const mo = byMonth.get(m);
    if (!mo) return { omzet: 0, kosten: 0, winst: 0 };
    const kosten = mo.invoices.reduce((s, i) => s + (invoiceCostById.get(i.id) ?? 0), 0) + fixedTotal;
    const overig = (incomeByMonth.get(m) ?? []).reduce((s, r) => s + r.amount, 0);
    const omzet = mo.invoiced + overig;
    return { omzet, kosten, winst: omzet - kosten };
  };

  // Omzet van de gekozen maand (gefactureerd + overig) — naast MRR in de
  // statrij, want de MRR beweegt traag maar de maandomzet vertelt het verhaal.
  const maandOmzet = profitOf(maand).omzet;

  // Jaaroverzicht: alle maanden van dit jaar. Verleden = echte omzet,
  // huidige maand krijgt de concepten er gestippeld bovenop (= verwacht
  // als alles verstuurd wordt), toekomstige maanden = prognose op MRR.
  const year = now.getFullYear();
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const ytdOmzet = months.reduce((s, m) => s + profitOf(m).omzet, 0);
  const ytdWinst = months.reduce((s, m) => s + profitOf(m).winst, 0);

  // Verschil met vorige maand (voor de omzet-stat).
  const prevMonthKey = months[months.length - 2];
  const prevOmzet = prevMonthKey ? profitOf(prevMonthKey).omzet : 0;
  const omzetDelta = maandOmzet - prevOmzet;

  // Projectie komende 6 maanden: retainers + gemiddeld los werk (3 mnd).
  const mrrForecast = clients.filter((c) => c.status !== "gepauzeerd").reduce((s, c) => s + c.monthlyValue, 0);
  const last3 = months.slice(-4, -1); // laatste 3 volledige maanden
  const avgExtra = last3.length
    ? Math.max(0, last3.reduce((s, m) => s + Math.max(0, profitOf(m).omzet - mrrForecast), 0) / last3.length)
    : 0;
  const outlookMonths: OutlookMonth[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const isCurrent = key === thisMonth;
    const g = goalByMonth.get(key);
    return {
      month: key,
      label: d.toLocaleDateString("nl-NL", { month: "short" }),
      projected: isCurrent ? profitOf(thisMonth).omzet + drafts.total : mrrForecast + avgExtra,
      goal: g?.goal ?? null,
      note: g?.note ?? null,
      isCurrent,
    };
  });

  // Btw dit kwartaal: incl − excl van betaalde facturen in de kwartaalmaanden.
  const q = Math.floor(now.getMonth() / 3);
  const qMonths = months.filter((m) => Math.floor((Number(m.slice(5)) - 1) / 3) === q && m.slice(0, 4) === String(now.getFullYear()));
  const vatThisQuarter = qMonths.reduce((s, m) => {
    const mo = byMonth.get(m);
    return s + (mo?.invoices ?? []).filter((i) => i.state === "paid").reduce((x, i) => x + (i.totalIncl - i.totalExcl), 0);
  }, 0);

  // Uitgaven-triage: mutaties zonder label.
  const unlabeled = bank.mutations.filter((m) => !linkedIds.has(m.id));

  const invoiceCostsSum = moneybird.invoices.reduce((s, i) => s + (invoiceCostById.get(i.id) ?? 0), 0);
  const maandOverig = (incomeByMonth.get(maand) ?? []).reduce((s, r) => s + r.amount, 0);
  const monthProfit = moneybird.invoiced + maandOverig - invoiceCostsSum - fixedTotal;
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat
          label={isCurrentMonth ? "Omzet deze maand" : `Omzet ${maandLabel}`}
          value={fmtEur(maandOmzet)}
          delta={`${omzetDelta >= 0 ? "+" : "−"}${fmtEur(Math.abs(Math.round(omzetDelta)))} vs vorige maand`}
          icon={icons.analytics}
        />
        <Stat
          label="Winst deze maand"
          value={fmtEur(Math.round(monthProfit))}
          delta={isCurrentMonth && drafts.total > 0 ? `+${fmtEur(drafts.total)} in concepten` : undefined}
          icon={icons.money}
        />
        <Stat label="MRR (retainers)" value={fmtEur(mrr)} icon={icons.money} />
        <Stat label="Netto marge" value={fmtEur(margin)} delta={`${marginPct}% marge`} icon={icons.analytics} />
        <Stat label="Nieuw deze maand" value={String(newThisMonth)} icon={icons.clients} />
      </div>

      {/* Vooruitblik: projectie + klikbare maanddoelen */}
      {!demo && moneybird.configured && (
        <OutlookCard months={outlookMonths} basis={{ mrr: mrrForecast, avgExtra, drafts: drafts.total }} />
      )}

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

      {/* Jaaroverzicht: omzet per maand + wat er verwacht wordt */}
      {!demo && moneybird.configured && (
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <Eyebrow>Jaar {year}</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Omzet per maand</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="text-muted text-[12px]">Omzet {year} </span>
                <strong className="font-mono">{fmtEur(ytdOmzet)}</strong>
              </span>
              <span>
                <span className="text-muted text-[12px]">Winst {year} </span>
                <strong className={`font-mono ${ytdWinst >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEur(ytdWinst)}</strong>
              </span>
              {drafts.total > 0 && (
                <span>
                  <span className="text-muted text-[12px]">Verwacht deze maand </span>
                  <strong className="font-mono text-amber-300">{fmtEur(profitOf(thisMonth).omzet + drafts.total)}</strong>
                </span>
              )}
            </div>
          </div>
          {(() => {
            const actual = new Map(months.map((m) => [m, profitOf(m).omzet]));
            const expectedNow = (actual.get(thisMonth) ?? 0) + drafts.total;
            const max = Math.max(...yearMonths.map((m) => actual.get(m) ?? 0), expectedNow, mrr, 1);
            const h = (v: number) => `${Math.max(2, Math.round((v / max) * 100))}%`;
            return (
              <>
                <div className="flex items-end gap-1.5 sm:gap-2.5 h-36">
                  {yearMonths.map((m) => {
                    const label = new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" });
                    const isNow = m === thisMonth;
                    const isPast = m < thisMonth;
                    const omzet = actual.get(m) ?? 0;
                    return (
                      <div key={m} className="flex-1 flex flex-col justify-end items-stretch h-full" title={
                        isNow
                          ? `${label}: ${fmtEur(omzet)} gefactureerd${drafts.total ? ` + ${fmtEur(drafts.total)} in concepten` : ""}`
                          : isPast
                            ? `${label}: ${fmtEur(omzet)}`
                            : `${label}: prognose ${fmtEur(mrr)} (MRR)`
                      }>
                        {isNow && drafts.total > 0 && (
                          <div className="rounded-t-md border border-dashed border-amber-300/60 bg-amber-300/10" style={{ height: h(drafts.total) }} />
                        )}
                        {(isPast || isNow) ? (
                          <div className={`${isNow && drafts.total > 0 ? "" : "rounded-t-md"} bg-accent/80`} style={{ height: h(omzet) }} />
                        ) : (
                          <div className="rounded-t-md border border-dashed border-white/[0.18]" style={{ height: h(mrr) }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 sm:gap-2.5 mt-1.5">
                  {yearMonths.map((m) => (
                    <div key={m} className={`flex-1 text-center text-[10px] font-mono uppercase ${m === thisMonth ? "text-accent" : "text-muted"}`}>
                      {new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" })}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted">
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent/80 align-middle mr-1.5" />gefactureerd</span>
                  {drafts.total > 0 && <span><span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-amber-300/60 bg-amber-300/10 align-middle mr-1.5" />nog te versturen (concepten)</span>}
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-white/[0.18] align-middle mr-1.5" />prognose op MRR</span>
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* Concepten in Moneybird: dit moet nog de deur uit deze maand */}
      {!demo && moneybird.configured && (
        <Card className={`p-6 mb-6 ${drafts.drafts.length > 0 ? "border-amber-300/25" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <div>
              <Eyebrow>Concepten in Moneybird</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Nog te versturen</h2>
            </div>
            {drafts.drafts.length > 0 && (
              <span className="text-sm">
                <span className="text-muted text-[12px]">Samen </span>
                <strong className="font-mono text-amber-300">{fmtEur(drafts.total)}</strong>
              </span>
            )}
          </div>
          {drafts.error ? (
            <p className="text-[13px] text-amber-300">{drafts.error}</p>
          ) : drafts.drafts.length === 0 ? (
            <p className="text-[13px] text-muted">Geen concepten — alles wat klaarstond is verstuurd. ✓</p>
          ) : (
            <>
              <p className="text-[13px] text-muted mb-3">
                Verstuur je alles, dan komt deze maand uit op{" "}
                <strong className="text-emerald-400 font-mono">{fmtEur(profitOf(thisMonth).omzet + drafts.total)}</strong>.
              </p>
              <div className="space-y-1">
                {drafts.drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.contact}</div>
                      <div className="text-[11px] text-muted">{d.reference ?? "concept"}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm">{fmtEur(d.totalExcl)}</span>
                      <Badge color="#FBBF24">concept</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Moneybird: wat er deze maand écht binnenkomt (facturen, excl. btw) */}
      {!demo && moneybird.configured && (
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <Eyebrow>Moneybird · {maandLabel}</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Wat er binnenkomt</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
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
              {maandOverig > 0 && (
                <span>
                  <span className="text-muted text-[12px]">Overig </span>
                  <strong className="font-mono text-emerald-400">+{fmtEur(maandOverig)}</strong>
                </span>
              )}
              <span>
                <span className="text-muted text-[12px]">Kosten </span>
                <strong className="font-mono text-red-400">{fmtEur(invoiceCostsSum + fixedTotal)}</strong>
              </span>
              <span>
                <span className="text-muted text-[12px]">Winst </span>
                <strong className={`font-mono ${monthProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEur(monthProfit)}</strong>
              </span>
            </div>
          </div>

          {/* Maandvergelijking: omzet/winst per maand, klik om te openen */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {months.map((m, i) => {
              const label = new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" });
              const activeMonth = m === maand;
              const { winst } = profitOf(m);
              const prev = i > 0 ? profitOf(months[i - 1]).winst : null;
              const arrow = prev === null ? "" : winst >= prev ? "↑" : "↓";
              return (
                <Link
                  key={m}
                  href={m === thisMonth ? "/platform/finance" : `/platform/finance?maand=${m}`}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-center transition-all border ${
                    activeMonth ? "border-accent/50 bg-accent/[0.08]" : "border-white/[0.06] hover:border-accent/30"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase text-muted">{label}</div>
                  <div className={`text-[12.5px] font-mono ${winst >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtEur(winst)} {arrow && <span className={winst >= (prev ?? 0) ? "text-emerald-400" : "text-red-400"}>{arrow}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          <OtherIncome month={maand} initial={incomeByMonth.get(maand) ?? []} />
          <div className="mb-4" />
          {moneybird.error ? (
            <p className="text-[13px] text-amber-300">{moneybird.error}</p>
          ) : moneybird.invoices.length === 0 ? (
            <p className="text-[13px] text-muted">Geen facturen in {maandLabel}.</p>
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
                  <div className="flex flex-wrap items-center gap-3 shrink-0 justify-end">
                    <span className="font-mono text-sm">{fmtEur(inv.totalExcl)}</span>
                    <InvoiceCost
                      invoiceId={inv.id}
                      invoiceLabel={inv.contact}
                      totalExcl={inv.totalExcl}
                      initialCost={invoiceCostById.get(inv.id) ?? 0}
                      initialBreakdown={breakdownById.get(inv.id) ?? null}
                    />
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

      {/* Potjes + uitgaven-triage */}
      {!demo && moneybird.configured && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <ReservesCard vatThisQuarter={vatThisQuarter} profitThisMonth={monthProfit} config={reserveConfig} />
          <ExpenseTriage
            unlabeled={unlabeled}
            totals={expenseTotals}
            clients={clients.filter((c) => c.status !== "gepauzeerd").map((c) => ({ id: c.id, label: c.name }))}
          />
        </div>
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
                  <div className="col-span-12 md:col-span-4">
                    <ClientFinanceDialog
                      clientId={c.id}
                      name={c.name}
                      monthlyValue={c.monthlyValue}
                      packageName={c.packageName}
                      videosPerMonth={c.videosPerMonth}
                      editorCost={c.editorCost}
                    >
                      <div className="flex items-center gap-2.5 cursor-pointer">
                        <Avatar initials={c.initials} size={30} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.name} <span className="text-muted">✎</span></div>
                          <div className="text-[11px] text-muted">{c.packageName ?? "— klik om in te stellen"}</div>
                        </div>
                      </div>
                    </ClientFinanceDialog>
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

        {/* Per pakket + vaste lasten */}
        <div className="space-y-6">
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
        {!demo && <FixedCosts initial={fixedCosts} />}
        </div>
      </div>
    </>
  );
}
