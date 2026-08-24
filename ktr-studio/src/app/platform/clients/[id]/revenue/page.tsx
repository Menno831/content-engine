import { getClient, getClientOrders } from "@/lib/data";
import { getMoneybirdMonth } from "@/lib/integrations/moneybird";
import { Card, Eyebrow, Badge } from "../../../_components";
import { fmtEur } from "../../../_data";
import { OrdersCard } from "../../OrdersCard";

const stateColor: Record<string, string> = {
  paid: "#34D399",
  open: "#FBBF24",
  pending_payment: "#FBBF24",
  late: "#F87171",
  uncollectible: "#6B7280",
};
const stateLabel: Record<string, string> = {
  paid: "betaald",
  open: "open",
  pending_payment: "in behandeling",
  late: "te laat",
  uncollectible: "oninbaar",
};

// Namen matchen soepel: "Flows Marketing Solutions" ↔ "Flows Marketing".
// Korte namen alleen exact, anders matcht "Max" ook "Maxima BV".
function looksLikeClient(contact: string, clientName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(contact);
  const b = norm(clientName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  return a.includes(b) || b.includes(a);
}

// Revenue-tab: wat deze klant dit jaar opleverde, per maand en per factuur.
export default async function ClientRevenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getClient(id);
  if (!c) return null;

  const now = new Date();
  // Vanaf januari van het lopende jaar — zo blijft "dit jaar" kloppen
  // en groeit het aantal Moneybird-calls niet elk jaar door.
  const months: string[] = [];
  for (let d = new Date(now.getFullYear(), 0, 1); d <= now; d.setMonth(d.getMonth() + 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [orders, ...monthsData] = await Promise.all([
    getClientOrders(id),
    ...months.map((m) => getMoneybirdMonth(m === thisMonth ? undefined : m)),
  ]);

  // Alleen facturen die bij deze klant horen.
  const perMonth = months.map((m, i) => {
    const invoices = (monthsData[i]?.invoices ?? []).filter((inv) => looksLikeClient(inv.contact, c.name));
    return {
      month: m,
      label: new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" }),
      invoices,
      total: invoices.reduce((s, inv) => s + inv.totalExcl, 0),
      paid: invoices.filter((inv) => inv.state === "paid").reduce((s, inv) => s + inv.totalExcl, 0),
    };
  });

  const lifetime = perMonth.reduce((s, m) => s + m.total, 0);
  const openAmount = perMonth.reduce((s, m) => s + (m.total - m.paid), 0);
  const maxMonth = Math.max(1, ...perMonth.map((m) => m.total));
  const allInvoices = perMonth.flatMap((m) => m.invoices);
  const configured = monthsData.some((m) => m?.configured);

  const orderValue = orders.reduce((s, o) => s + o.price, 0);
  const orderCost = orders.reduce((s, o) => s + o.editorCost + o.otherCost, 0);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label="Retainer" value={c.monthlyValue ? `${fmtEur(c.monthlyValue)}/mnd` : "—"} />
        <Tile label="Gefactureerd dit jaar" value={fmtEur(lifetime)} />
        <Tile label="Nog open" value={fmtEur(openAmount)} tone={openAmount > 0 ? "warn" : undefined} />
        <Tile label="Marge/mnd" value={fmtEur(c.monthlyValue - c.editorCost)} tone="good" />
      </div>

      {!configured ? (
        <Card className="p-5 mb-6 border-dashed">
          <p className="text-[13px] text-muted">
            Moneybird is niet gekoppeld — zodra <code className="text-accent">MONEYBIRD_API_TOKEN</code> staat, verschijnen
            de facturen van deze klant hier automatisch.
          </p>
        </Card>
      ) : (
        <Card className="p-6 mb-6">
          <Eyebrow>Per maand</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-4">Wat {c.name} opleverde</h2>

          {lifetime === 0 ? (
            <p className="text-[13px] text-muted">
              Nog geen facturen op deze naam gevonden in Moneybird. Staat de klant daar onder een andere bedrijfsnaam? Dan
              koppelen we later op factuurnummer.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-32 mb-3">
                {perMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1.5" title={fmtEur(m.total)}>
                    <div
                      className="w-full rounded-t-md bg-accent/70 min-h-[2px] transition-all"
                      style={{ height: `${(m.total / maxMonth) * 100}%` }}
                    />
                    <span className="text-[10px] font-mono uppercase text-muted">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[12px] text-muted">
                <span>{perMonth.filter((m) => m.total > 0).length} maanden met omzet</span>
                <span>
                  Gemiddeld{" "}
                  {fmtEur(Math.round(lifetime / Math.max(1, perMonth.filter((m) => m.total > 0).length)))}/mnd
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {allInvoices.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="font-display font-extrabold text-xl mb-4">Facturen</h2>
          <div className="space-y-1">
            {allInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <div className="text-sm truncate">{inv.reference ?? "—"}</div>
                  <div className="text-[11px] text-muted">
                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-sm">{fmtEur(inv.totalExcl)}</span>
                  <Badge color={stateColor[inv.state] ?? "#6B7280"}>{stateLabel[inv.state] ?? inv.state}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Opdrachten van deze klant (los werk naast de retainer) */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrdersCard clientId={id} orders={orders} />
        </div>
        <Card className="p-6 h-fit">
          <Eyebrow>Opdrachten</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-4">Los werk</h2>
          <div className="space-y-3 text-sm">
            <Row label="Aantal" value={String(orders.length)} />
            <Row label="Waarde" value={fmtEur(orderValue)} />
            <Row label="Kosten" value={fmtEur(orderCost)} />
            <Row label="Marge" value={fmtEur(orderValue - orderCost)} good />
          </div>
        </Card>
      </div>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">{label}</div>
      <div
        className={`font-display font-extrabold text-2xl ${
          tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : ""
        }`}
      >
        {value}
      </div>
    </Card>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${good ? "text-emerald-400" : ""}`}>{value}</span>
    </div>
  );
}
