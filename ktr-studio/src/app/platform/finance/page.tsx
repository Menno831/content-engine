import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader, Card, Stat, Avatar, Badge, Eyebrow, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { getMoneybirdMonth, getMoneybirdDrafts, getMoneybirdMutations } from "@/lib/integrations/moneybird";
import { getStripeMonth, getStripeSubscriptions, getStripePayouts, stripeConfigured } from "@/lib/integrations/stripe";
import { StripeCard } from "./StripeCard";
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
import { RecurringCard } from "./RecurringCard";
import { FinanceTodo, type TodoItem } from "./FinanceTodo";
import { findRecurring } from "@/lib/recurring";
import { getEditors } from "@/lib/editors";
import { usdToEurRate, toEur, fmtMoney } from "@/lib/fx";
import { getDeals, pipelineFor, pipelineMax } from "@/lib/deals";
import { PipelineCard } from "./PipelineCard";
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
  // Bankmutaties 120 dagen terug: genoeg om terugkerende afschrijvingen
  // (vaste lasten) in minstens twee maanden te herkennen.
  const [{ clients, demo }, { agency }, drafts, bank, editors, usdRate, deals, ...allMonths] = await Promise.all([
    getWorkspaceData(),
    getSessionContext(),
    getMoneybirdDrafts(),
    getMoneybirdMutations(120),
    getEditors(),
    usdToEurRate(),
    getDeals(),
    ...months.map((m) => getMoneybirdMonth(m === thisMonth ? undefined : m)),
  ]);
  const byMonth = new Map(months.map((m, i) => [m, allMonths[i]]));
  const moneybird = byMonth.get(maand) ?? allMonths[allMonths.length - 1];

  // Stripe naast Moneybird: per maand de betalingen (netto), ontdubbeld op
  // bedrag tegen de betaalde Moneybird-facturen van die maand, plus de
  // abonnementen en uitbetalingen (die zijn niet maandgebonden).
  const stripeOn = !demo && stripeConfigured();
  const [stripeSubs, stripePayouts, ...stripeMonths] = stripeOn
    ? await Promise.all([
        getStripeSubscriptions(),
        getStripePayouts(6),
        ...months.map((m) => {
          const mb = byMonth.get(m);
          const paid = (mb?.invoices ?? []).filter((i) => i.state === "paid").flatMap((i) => [i.totalIncl, i.totalExcl]);
          return getStripeMonth(m === thisMonth ? undefined : m, paid);
        }),
      ])
    : [null, null];
  const stripeByMonth = new Map(months.map((m, i) => [m, stripeMonths[i]]));
  const stripe = stripeByMonth.get(maand) ?? null;
  // Wat Stripe toevoegt aan de omzet van een maand: netto betalingen die
  // niet ook als betaalde factuur in Moneybird staan, min terugbetalingen.
  const stripeExtra = (m: string) => {
    const sm = stripeByMonth.get(m);
    if (!sm) return 0;
    return sm.payments.filter((p) => p.refund || !p.inMoneybird).reduce((acc, p) => acc + p.net, 0);
  };

  // Kosten per factuur (alle maanden), vaste lasten en overige inkomsten.
  const supabase = await supabaseServer();
  let invoiceCostById = new Map<string, number>();
  let breakdownById = new Map<string, CostLine[] | null>();
  let fixedCosts: FixedCostRow[] = [];
  let incomeByMonth = new Map<string, IncomeRow[]>();
  if (supabase && !demo) {
    const allIds = [...allMonths.flatMap((mo) => mo.invoices.map((i) => i.id)), ...drafts.drafts.map((d) => d.id)];
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
  // Gelabelde uitgaven per maand (positief), zodat de kostenhistorie
  // per maand laat zien wat er via de bank uitging.
  const expenseByMonth = new Map<string, { klant: number; vast: number; prive: number; overig: number }>();
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
      const mKey = String(l.mutation_date ?? "").slice(0, 7);
      if (mKey) {
        const cur = expenseByMonth.get(mKey) ?? { klant: 0, vast: 0, prive: 0, overig: 0 };
        const kind = String(l.kind) as keyof typeof cur;
        if (kind in cur) cur[kind] += Math.abs(Number(l.amount ?? 0));
        expenseByMonth.set(mKey, cur);
      }
      if (mKey !== thisMonth) continue;
      totalsMap.set(String(l.kind), (totalsMap.get(String(l.kind)) ?? 0) + Number(l.amount ?? 0));
    }
    expenseTotals = [...totalsMap.entries()].map(([kind, total]) => ({ kind, total }));
    reserveConfig = (agRes.data?.reserve_config as ReserveConfig | null) ?? null;
  }

  // Weggeklikte taken (tot het einde van de maand) niet meer tonen.
  let dismissed = new Set<string>();
  if (supabase && !demo) {
    const { data } = await supabase.from("finance_dismissals").select("item_key,until").gte("until", `${thisMonth}-01`);
    dismissed = new Set((data ?? []).filter((d) => String(d.until) >= now.toISOString().slice(0, 10)).map((d) => String(d.item_key)));
  }

  const fixedTotal = fixedCosts.reduce((s, r) => s + r.amount, 0);

  // Winst per maand: gefactureerd + overig − editkosten (per factuur) −
  // vaste lasten − overige gelabelde uitgaven uit de bank. Bankuitgaven
  // die als "klant" gelabeld zijn tellen niet dubbel: dat zijn doorgaans
  // dezelfde editor-betalingen die al als factuurkosten staan.
  const profitOf = (m: string) => {
    const mo = byMonth.get(m);
    const ex = expenseByMonth.get(m) ?? { klant: 0, vast: 0, prive: 0, overig: 0 };
    if (!mo) return { omzet: 0, kosten: 0, winst: 0, edit: 0, vast: fixedTotal + ownContentCost, overigUit: ex.overig, klantBank: ex.klant };
    const edit = mo.invoices.reduce((s, i) => s + (invoiceCostById.get(i.id) ?? 0), 0);
    const kosten = edit + fixedTotal + ex.overig + ownContentCost;
    const overig = (incomeByMonth.get(m) ?? []).reduce((s, r) => s + r.amount, 0);
    const omzet = mo.invoiced + overig + stripeExtra(m);
    return { omzet, kosten, winst: omzet - kosten, edit, vast: fixedTotal + ownContentCost, overigUit: ex.overig, klantBank: ex.klant };
  };

  // Omzet van de gekozen maand (gefactureerd + overig) — naast MRR in de
  // statrij, want de MRR beweegt traag maar de maandomzet vertelt het verhaal.
  const maandOmzet = profitOf(maand).omzet;

  // Jaaroverzicht: alle maanden van dit jaar. Verleden = echte omzet,
  // huidige maand krijgt de concepten er gestippeld bovenop (= verwacht
  // als alles verstuurd wordt), toekomstige maanden dezelfde prognose als
  // de vooruitblik — inclusief je pijplijn — met je maanddoel als lijn.
  const year = now.getFullYear();
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const ytdOmzet = months.reduce((s, m) => s + profitOf(m).omzet, 0);
  const ytdWinst = months.reduce((s, m) => s + profitOf(m).winst, 0);

  // Verschil met vorige maand (voor de omzet-stat).
  const prevMonthKey = months[months.length - 2];
  const prevOmzet = prevMonthKey ? profitOf(prevMonthKey).omzet : 0;
  const omzetDelta = maandOmzet - prevOmzet;

  // Projectie komende 6 maanden: retainers + gemiddeld los werk (3 mnd).
  // Klanten die in dollars betalen tellen we om naar euro; alleen zo
  // kloppen MRR, marge en prognose als één bedrag.
  const eurRetainer = (c: (typeof clients)[number]) => toEur(c.monthlyValue, c.currency, usdRate);
  const eurEditor = (c: (typeof clients)[number]) => toEur(c.editorCost, c.currency, usdRate);
  // Je eigen merk is geen klant: geen omzet, maar de edit-kosten zijn
  // wel echte maandlasten en tellen dus mee in de winst.
  const ownContentCost = clients
    .filter((c) => c.isOwnBrand && c.status !== "gepauzeerd")
    .reduce((s, c) => s + eurEditor(c), 0);
  const mrrForecast = clients.filter((c) => c.status !== "gepauzeerd" && !c.isOwnBrand).reduce((s, c) => s + eurRetainer(c), 0);
  const last3 = months.slice(-4, -1); // laatste 3 volledige maanden
  const avgExtra = last3.length
    ? Math.max(0, last3.reduce((s, m) => s + Math.max(0, profitOf(m).omzet - mrrForecast), 0) / last3.length)
    : 0;
  // Eén formule voor de vooruitblik én de jaargrafiek, zodat beide
  // hetzelfde zeggen over een maand die nog moet komen.
  const projectionFor = (key: string) => mrrForecast + avgExtra + pipelineFor(deals, key, usdRate);
  // Als álles doorgaat: dezelfde basis, maar met de hele pijplijn erin.
  const bestCaseFor = (key: string) => mrrForecast + avgExtra + pipelineMax(deals, key, usdRate);
  const outlookMonths: OutlookMonth[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const isCurrent = key === thisMonth;
    const g = goalByMonth.get(key);
    const pipe = pipelineFor(deals, key, usdRate);
    const maxPipe = pipelineMax(deals, key, usdRate);
    return {
      month: key,
      label: d.toLocaleDateString("nl-NL", { month: "short" }),
      projected: isCurrent ? profitOf(thisMonth).omzet + drafts.total + pipe : projectionFor(key),
      best: isCurrent ? profitOf(thisMonth).omzet + drafts.total + maxPipe : bestCaseFor(key),
      pipeline: pipe,
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

  const maandOverig = (incomeByMonth.get(maand) ?? []).reduce((s, r) => s + r.amount, 0);
  const monthProfit = profitOf(maand).winst;
  const billable = clients.filter((c) => c.status !== "gepauzeerd");
  // Alles wat als klantdeal telt — je eigen merk hoort daar niet bij.
  const paying = billable.filter((c) => !c.isOwnBrand);
  const target = Number(agency?.monthly_target ?? 0);

  const mrr = paying.reduce((s, c) => s + eurRetainer(c), 0);
  const editorCosts = paying.reduce((s, c) => s + eurEditor(c), 0);
  const inUsd = billable.filter((c) => (c.currency ?? "EUR").toUpperCase() === "USD");
  const margin = mrr - editorCosts;
  const marginPct = mrr ? Math.round((margin / mrr) * 100) : 0;
  const newThisMonth = clients.filter((c) => c.createdThisMonth).length;

  // Per pakket samenvatten.
  const byPackage = new Map<string, { count: number; mrr: number; margin: number }>();
  for (const c of paying) {
    const key = c.packageName || "Geen pakket";
    const cur = byPackage.get(key) ?? { count: 0, mrr: 0, margin: 0 };
    cur.count += 1;
    cur.mrr += eurRetainer(c);
    cur.margin += eurRetainer(c) - eurEditor(c);
    byPackage.set(key, cur);
  }

  const sorted = [...billable].sort((a, b) => eurRetainer(b) - eurEditor(b) - (eurRetainer(a) - eurEditor(a)));

  // ── Vaste lasten herkennen in de bank ───────────────────────────
  const recurring = !demo && moneybird.configured ? findRecurring(bank.mutations, fixedCosts.map((f) => f.name), linkedIds) : [];

  // ── Wat mist er nog voor een kloppend overzicht? ────────────────
  // Elk punt met de kortste weg om het direct te fixen.
  const todos: TodoItem[] = [];
  if (!demo) {
    const thisMo = byMonth.get(thisMonth);
    const firstName = (n: string) => n.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    const hasInvoiceFor = (name: string) => {
      const fn = firstName(name);
      if (!fn) return false;
      const all = [...(thisMo?.invoices ?? []), ...drafts.drafts];
      return all.some((i) => i.contact.toLowerCase().includes(fn));
    };
    // Klanten in onboarding zonder retainer: de deal wordt nog gevormd,
    // daar hoeft geen taak voor te staan. Actieve klanten zonder bedrag wel.
    for (const c of paying) {
      if (c.monthlyValue > 0 || c.status === "onboarding") continue;
      todos.push({
        key: `retainer:${c.id}`,
        text: `${c.name} heeft nog geen retainer — de MRR klopt pas als dit is ingevuld.`,
        action: (
          <ClientFinanceDialog
            clientId={c.id}
            name={c.name}
            monthlyValue={c.monthlyValue}
            packageName={c.packageName}
            videosPerMonth={c.videosPerMonth}
            editorCost={c.editorCost}
            videoPrice={c.videoPrice}
            invoiceDay={c.invoiceDay}
            currency={c.currency}
            isOwnBrand={c.isOwnBrand}
          >
            <span className="shrink-0 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1 text-[12px] text-muted transition-all cursor-pointer">Instellen →</span>
          </ClientFinanceDialog>
        ),
      });
    }
    if (moneybird.configured) {
      const dayNow = now.getDate();
      for (const c of paying) {
        if (c.monthlyValue <= 0) continue;
        const day = c.invoiceDay ?? 1;
        if (dayNow < day) continue;
        if (hasInvoiceFor(c.name)) continue;
        todos.push({
          key: `factuur:${c.id}`,
          text: `Factuur voor ${c.name} moet eruit (${fmtMoney(c.monthlyValue, c.currency)}, dag ${day} is geweest) — nog niets in Moneybird.`,
          href: "https://moneybird.com",
          external: true,
        });
      }
      const noCost = (thisMo?.invoices ?? []).filter((i) => !invoiceCostById.has(i.id));
      if (noCost.length) {
        todos.push({
          key: "editkosten",
          text: `${noCost.length} factu${noCost.length === 1 ? "ur" : "ren"} deze maand zonder editkosten — zonder kosten klopt je winst niet.`,
          href: "#facturen",
        });
      }
      if (unlabeled.length) {
        todos.push({ key: "triage", text: `${unlabeled.length} bankafschrijvingen nog zonder label (klant / vast / privé / overig).`, href: "#triage" });
      }
      if (recurring.length) {
        todos.push({
          key: "vast",
          text: `${recurring.length} terugkerende afschrijving${recurring.length === 1 ? "" : "en"} die nog niet als vaste last staan.`,
          href: "#vast",
        });
      }
    }
    const noAmount = deals.filter((d) => ["gesprek", "voorstel", "mondeling_ja"].includes(d.stage) && d.monthlyValue <= 0);
    if (noAmount.length) {
      todos.push({
        key: "dealbedrag",
        text: `${noAmount.map((d) => d.name).join(", ")}: nog geen maandbedrag — zonder bedrag telt de deal voor niets mee in de vooruitblik.`,
        href: "#pijplijn",
      });
    }
    const noRate = editors.filter((e) => e.active && !(e.payShortform ?? e.payPerVideo) && !e.payLongform);
    if (noRate.length) {
      todos.push({
        key: "editors",
        text: `${noRate.map((e) => e.name).join(", ")}: geen tarief ingevuld — kostprijs per video blijft leeg.`,
        href: "/platform/editors",
      });
    }
  }

  // ── Kostenhistorie: laatste 6 maanden ───────────────────────────
  const historyMonths = months.slice(-6);

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
              valuta: c.currency ?? "EUR",
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

      <FinanceTodo items={todos.filter((t) => !dismissed.has(t.key))} />

      {/* Vooruitblik: projectie + klikbare maanddoelen */}
      {!demo && moneybird.configured && (
        <OutlookCard months={outlookMonths} basis={{ mrr: mrrForecast, avgExtra, drafts: drafts.total }} />
      )}

      {!demo && (
        <PipelineCard
          deals={deals}
          weighted={pipelineFor(deals, `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`, usdRate)}
          usdRate={usdRate}
        />
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
            const goalOf = (m: string) => goalByMonth.get(m)?.goal ?? 0;
            const max = Math.max(
              ...yearMonths.map((m) => Math.max(actual.get(m) ?? 0, m > thisMonth ? bestCaseFor(m) : 0, goalOf(m))),
              expectedNow,
              1
            );
            const h = (v: number) => `${Math.max(2, Math.round((v / max) * 100))}%`;
            return (
              <>
                <div className="flex items-end gap-1.5 sm:gap-2.5 h-36">
                  {yearMonths.map((m) => {
                    const label = new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" });
                    const isNow = m === thisMonth;
                    const isPast = m < thisMonth;
                    const omzet = actual.get(m) ?? 0;
                    const doel = goalOf(m);
                    const pipe = pipelineFor(deals, m, usdRate);
                    const prognose = projectionFor(m);
                    const haalbaar = isPast || isNow ? omzet + (isNow ? drafts.total : 0) : prognose;
                    return (
                      <div key={m} className="flex-1 relative flex flex-col justify-end items-stretch h-full" title={
                        [
                          isNow
                            ? `${label}: ${fmtEur(omzet)} gefactureerd${drafts.total ? ` + ${fmtEur(drafts.total)} in concepten` : ""}`
                            : isPast
                              ? `${label}: ${fmtEur(omzet)}`
                              : `${label}: verwacht ${fmtEur(Math.round(prognose))}${pipe > 0 ? ` · als alles doorgaat ${fmtEur(Math.round(bestCaseFor(m)))}` : ""}`,
                          doel > 0 ? `doel ${fmtEur(doel)} — ${haalbaar >= doel ? "gehaald" : `nog ${fmtEur(Math.round(doel - haalbaar))}`}` : null,
                        ].filter(Boolean).join(" · ")
                      }>
                        {doel > 0 && (
                          <div
                            className={`absolute inset-x-0 border-t border-dashed z-10 ${haalbaar >= doel ? "border-emerald-400/70" : "border-white/35"}`}
                            style={{ bottom: h(doel) }}
                          />
                        )}
                        {isNow && drafts.total > 0 && (
                          <div className="rounded-t-md border border-dashed border-amber-300/60 bg-amber-300/10" style={{ height: h(drafts.total) }} />
                        )}
                        {!isPast && !isNow && bestCaseFor(m) > prognose + 1 && (
                          <div
                            className="absolute inset-x-0 border-t border-dashed border-accent/45 z-10"
                            style={{ bottom: h(bestCaseFor(m)) }}
                          />
                        )}
                        {(isPast || isNow) ? (
                          <div className={`${isNow && drafts.total > 0 ? "" : "rounded-t-md"} bg-accent/80`} style={{ height: h(omzet) }} />
                        ) : (
                          <>
                            {pipe > 0 && (
                              <div className="rounded-t-md border border-dashed border-accent/50 bg-accent/[0.12]" style={{ height: h(pipe) }} />
                            )}
                            <div className={`${pipe > 0 ? "" : "rounded-t-md"} border border-dashed border-white/[0.18]`} style={{ height: h(Math.max(0, prognose - pipe)) }} />
                          </>
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
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-white/[0.18] align-middle mr-1.5" />prognose (retainers + los werk)</span>
                  {yearMonths.some((m) => m > thisMonth && pipelineFor(deals, m, usdRate) > 0) && (
                    <span><span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-accent/50 bg-accent/[0.12] align-middle mr-1.5" />pijplijn (gewogen)</span>
                  )}
                  {yearMonths.some((m) => m > thisMonth && pipelineMax(deals, m, usdRate) > pipelineFor(deals, m, usdRate) + 1) && (
                    <span><span className="inline-block w-2.5 h-[2px] border-t border-dashed border-accent/45 align-middle mr-1.5" />als alles doorgaat</span>
                  )}
                  {yearMonths.some((m) => (goalByMonth.get(m)?.goal ?? 0) > 0) && (
                    <span><span className="inline-block w-2.5 h-[2px] border-t border-dashed border-white/35 align-middle mr-1.5" />maanddoel</span>
                  )}
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* Kostenhistorie: wat hield je de afgelopen maanden over? */}
      {!demo && moneybird.configured && historyMonths.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <Eyebrow>Afgelopen {historyMonths.length} maanden</Eyebrow>
              <h2 className="font-display font-extrabold text-xl">Wat je overhoudt na edit- en softwarekosten</h2>
            </div>
            <span className="text-[12px] text-muted">Editkosten uit je facturen · vaste lasten en overige uitgaven uit de bank</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  <th className="text-left px-3 pb-2 font-normal">Maand</th>
                  <th className="text-right px-3 pb-2 font-normal">Omzet</th>
                  <th className="text-right px-3 pb-2 font-normal">Editkosten</th>
                  <th className="text-right px-3 pb-2 font-normal">Vaste lasten</th>
                  <th className="text-right px-3 pb-2 font-normal">Overig</th>
                  <th className="text-right px-3 pb-2 font-normal">Winst</th>
                  <th className="text-right px-3 pb-2 font-normal">Marge</th>
                </tr>
              </thead>
              <tbody>
                {historyMonths.map((m) => {
                  const p = profitOf(m);
                  const pct = p.omzet ? Math.round((p.winst / p.omzet) * 100) : 0;
                  const label = new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "long" });
                  return (
                    <tr key={m} className={`border-t border-white/[0.05] ${m === thisMonth ? "bg-accent/[0.04]" : ""}`}>
                      <td className="px-3 py-2 font-medium capitalize">
                        <Link href={m === thisMonth ? "/platform/finance" : `/platform/finance?maand=${m}`} className="hover:text-accent">{label}</Link>
                        {m === thisMonth && <span className="ml-2 text-[10px] font-mono uppercase text-accent">nu</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmtEur(Math.round(p.omzet))}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted">{p.edit ? `−${fmtEur(Math.round(p.edit))}` : <span className="text-amber-300/80" title="Nog geen editkosten ingevuld bij de facturen van deze maand">?</span>}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted">−{fmtEur(Math.round(p.vast))}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted">{p.overigUit ? `−${fmtEur(Math.round(p.overigUit))}` : "—"}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${p.winst >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEur(Math.round(p.winst))}</td>
                      <td className={`px-3 py-2 text-right font-mono ${pct >= 50 ? "text-emerald-400" : pct >= 30 ? "text-amber-300" : "text-red-400"}`}>{p.omzet ? `${pct}%` : "—"}</td>
                    </tr>
                  );
                })}
                {historyMonths.length > 1 && (() => {
                  const tot = historyMonths.reduce(
                    (acc, m) => { const p = profitOf(m); return { omzet: acc.omzet + p.omzet, edit: acc.edit + p.edit, vast: acc.vast + p.vast, overig: acc.overig + p.overigUit, winst: acc.winst + p.winst }; },
                    { omzet: 0, edit: 0, vast: 0, overig: 0, winst: 0 }
                  );
                  const pct = tot.omzet ? Math.round((tot.winst / tot.omzet) * 100) : 0;
                  return (
                    <tr className="border-t border-white/[0.12] text-foreground/90">
                      <td className="px-3 py-2 font-bold">Totaal</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(Math.round(tot.omzet))}</td>
                      <td className="px-3 py-2 text-right font-mono">−{fmtEur(Math.round(tot.edit))}</td>
                      <td className="px-3 py-2 text-right font-mono">−{fmtEur(Math.round(tot.vast))}</td>
                      <td className="px-3 py-2 text-right font-mono">{tot.overig ? `−${fmtEur(Math.round(tot.overig))}` : "—"}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${tot.winst >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEur(Math.round(tot.winst))}</td>
                      <td className="px-3 py-2 text-right font-mono">{tot.omzet ? `${pct}%` : "—"}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <RecurringCard suggestions={recurring} />

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
                    <div className="flex flex-wrap items-center gap-3 shrink-0 justify-end">
                      <span className="font-mono text-sm">{fmtEur(d.totalExcl)}</span>
                      <InvoiceCost
                        invoiceId={d.id}
                        invoiceLabel={d.contact}
                        totalExcl={d.totalExcl}
                        initialCost={invoiceCostById.get(d.id) ?? 0}
                        initialBreakdown={breakdownById.get(d.id) ?? null}
                      />
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
      {/* Stripe: betalingen, abonnementen en uitbetalingen (alleen-lezen) */}
      {stripeOn && stripe && stripeSubs && stripePayouts && (
        <StripeCard maandLabel={maandLabel} month={stripe} subs={stripeSubs} payouts={stripePayouts} />
      )}

      {!demo && moneybird.configured && (
        <Card id="facturen" className="p-6 mb-6">
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
                <strong className="font-mono text-red-400">{fmtEur(Math.round(profitOf(maand).kosten))}</strong>
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
        <div id="triage" className="grid lg:grid-cols-2 gap-6 mb-6">
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
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <h2 className="font-display font-extrabold text-xl">Per klant</h2>
            {inUsd.length > 0 && (
              <span className="text-[11.5px] text-muted">
                Bedragen in de valuta van de klant · totalen omgerekend met $1 = €{usdRate.toFixed(2)}
              </span>
            )}
          </div>
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
                      videoPrice={c.videoPrice}
                      invoiceDay={c.invoiceDay}
                      currency={c.currency}
                    >
                      <div className="flex items-center gap-2.5 cursor-pointer">
                        <Avatar initials={c.initials} size={30} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.name} <span className="text-muted">✎</span></div>
                          <div className="text-[11px] text-muted">{c.isOwnBrand ? "eigen merk · geen retainer" : (c.packageName ?? "— klik om in te stellen")}</div>
                        </div>
                      </div>
                    </ClientFinanceDialog>
                  </div>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm">{c.isOwnBrand ? <span className="text-muted">—</span> : fmtMoney(c.monthlyValue, c.currency)}</span>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm text-muted">{fmtMoney(c.editorCost, c.currency)}</span>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-sm text-emerald-400">{c.isOwnBrand ? <span className="text-muted">—</span> : fmtMoney(m, c.currency)}</span>
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
