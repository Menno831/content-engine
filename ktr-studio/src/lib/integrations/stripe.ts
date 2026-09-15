// ════════════════════════════════════════════════════════════════
// Stripe-koppeling (alleen-lezen): wat er via Stripe binnenkomt, naast de
// Moneybird-facturen. Drie dingen: betalingen van een maand (netto na
// Stripe-kosten), lopende abonnementen (MRR) en wat er onderweg is naar de
// bank. Geen schrijfacties: Stripe blijft de bron.
//
// Nodig in Vercel:
//   STRIPE_SECRET_KEY   (dashboard.stripe.com → Developers → API keys;
//                        een "restricted key" met alleen lezen op Balance,
//                        Charges, Customers, Subscriptions en Payouts is genoeg)
// ════════════════════════════════════════════════════════════════

const KEY = (process.env.STRIPE_SECRET_KEY || "").trim().split(/\s+/)[0] || "";

export const stripeConfigured = () => Boolean(KEY);

export interface StripePayment {
  id: string;
  date: string;          // YYYY-MM-DD
  who: string;           // klantnaam, mail of omschrijving
  description: string;
  gross: number;         // in hele euro's (of de valuta van het account)
  fee: number;
  net: number;
  currency: string;      // "eur", "usd", …
  refund: boolean;
  inMoneybird: boolean;  // zelfde bedrag als een betaalde Moneybird-factuur in die maand
}

export interface StripeMonth {
  configured: boolean;
  payments: StripePayment[];
  gross: number;
  fee: number;
  net: number;
  refunds: number;       // positief getal, al van net afgetrokken
  currency: string;
  error?: string;
}

export interface StripeSubscription {
  id: string;
  who: string;
  monthly: number;       // genormaliseerd naar per maand
  currency: string;
  interval: string;      // "maand" | "jaar" | "week" | "dag"
  status: string;        // active | past_due | trialing | …
  nextCharge: string | null;
}

export interface StripeSubscriptions {
  configured: boolean;
  subscriptions: StripeSubscription[];
  mrr: number;
  pastDue: number;       // aantal
  error?: string;
}

export interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  arrival: string;
  status: string;        // paid | pending | in_transit | failed | canceled
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const minor = (n: number, currency: string) => {
  // Stripe rekent in de kleinste eenheid; yen en een paar andere niet.
  const zero = ["jpy", "krw", "vnd", "clp", "isk", "huf", "twd", "ugx"];
  return zero.includes(currency) ? n : n / 100;
};

const dateOf = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

function safeError(e: unknown, prefix: string): string {
  let why = e instanceof Error ? e.message : "onbekende fout";
  // De sleutel mag nooit in een foutmelding op het scherm belanden.
  if (KEY) why = why.split(KEY).join("•••");
  return `${prefix} (${why}).`;
}

async function stripeGet(path: string, params: Record<string, string | string[]>): Promise<any> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.set(k, v);
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}?${q.toString()}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    // Betalingen veranderen niet per minuut; 10 min cache houdt Finance snel.
    next: { revalidate: 600 },
  });
  if (!res.ok) {
    const why =
      res.status === 401 ? "sleutel ongeldig" :
      res.status === 403 ? "sleutel mist leesrechten op dit onderdeel" :
      `status ${res.status}`;
    throw new Error(why);
  }
  return res.json();
}

function whoOf(src: any): string {
  if (!src || typeof src !== "object") return "Onbekend";
  return (
    src.billing_details?.name ||
    src.customer?.name ||
    src.customer?.email ||
    src.receipt_email ||
    src.billing_details?.email ||
    src.description ||
    "Onbekend"
  );
}

// month als "YYYY-MM"; weggelaten = deze maand. moneybirdPaid = bedragen
// (incl. en excl. btw) van betaalde Moneybird-facturen in dezelfde maand,
// zodat een betaling die ook gefactureerd is niet dubbel in de omzet telt.
export async function getStripeMonth(month?: string, moneybirdPaid: number[] = []): Promise<StripeMonth> {
  const empty: StripeMonth = { configured: stripeConfigured(), payments: [], gross: 0, fee: 0, net: 0, refunds: 0, currency: "eur" };
  if (!KEY) return empty;

  const now = new Date();
  const [y, m] = month && /^\d{4}-\d{2}$/.test(month)
    ? month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const from = Math.floor(Date.UTC(y, m - 1, 1) / 1000);
  const to = Math.floor(Date.UTC(y, m, 1) / 1000) - 1;

  try {
    const data = await stripeGet("balance_transactions", {
      "created[gte]": String(from),
      "created[lte]": String(to),
      limit: "100",
      "expand[]": ["data.source", "data.source.customer"],
    });
    const rows: any[] = data?.data ?? [];
    const kinds = new Set(["charge", "payment", "refund", "payment_refund"]);
    const payments: StripePayment[] = rows
      .filter((r) => kinds.has(String(r.type)))
      .map((r) => {
        const currency = String(r.currency || "eur").toLowerCase();
        const gross = minor(Number(r.amount ?? 0), currency);
        const fee = minor(Number(r.fee ?? 0), currency);
        const net = minor(Number(r.net ?? 0), currency);
        const refund = String(r.type).includes("refund");
        const tol = Math.max(2, Math.abs(gross) * 0.01);
        const inMoneybird = !refund && moneybirdPaid.some((p) => Math.abs(p - gross) <= tol);
        return {
          id: String(r.id),
          date: dateOf(Number(r.created ?? 0)),
          who: whoOf(r.source),
          description: String(r.description || r.source?.description || "").slice(0, 120),
          gross, fee, net, currency, refund, inMoneybird,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const currency = payments[0]?.currency ?? "eur";
    const gross = payments.filter((p) => !p.refund).reduce((s, p) => s + p.gross, 0);
    const fee = payments.reduce((s, p) => s + p.fee, 0);
    const refunds = Math.abs(payments.filter((p) => p.refund).reduce((s, p) => s + p.gross, 0));
    const net = payments.reduce((s, p) => s + p.net, 0);
    return { configured: true, payments, gross, fee, net, refunds, currency };
  } catch (e) {
    return { ...empty, configured: true, error: safeError(e, "Stripe niet bereikbaar") };
  }
}

const intervalLabel: Record<string, string> = { month: "maand", year: "jaar", week: "week", day: "dag" };

export async function getStripeSubscriptions(): Promise<StripeSubscriptions> {
  if (!KEY) return { configured: false, subscriptions: [], mrr: 0, pastDue: 0 };
  try {
    const [active, pastDue] = await Promise.all([
      stripeGet("subscriptions", { status: "active", limit: "100", "expand[]": ["data.customer"] }),
      stripeGet("subscriptions", { status: "past_due", limit: "100", "expand[]": ["data.customer"] }),
    ]);
    const rows: any[] = [...(active?.data ?? []), ...(pastDue?.data ?? [])];
    const subscriptions: StripeSubscription[] = rows.map((s) => {
      let monthly = 0;
      let currency = "eur";
      let interval = "maand";
      for (const it of s.items?.data ?? []) {
        const price = it.price ?? {};
        currency = String(price.currency || currency).toLowerCase();
        const amount = minor(Number(price.unit_amount ?? 0), currency) * Number(it.quantity ?? 1);
        const iv = String(price.recurring?.interval || "month");
        const count = Number(price.recurring?.interval_count ?? 1) || 1;
        interval = intervalLabel[iv] ?? iv;
        const perMonth =
          iv === "year" ? amount / (12 * count) :
          iv === "week" ? (amount * 52) / (12 * count) :
          iv === "day" ? (amount * 365) / (12 * count) :
          amount / count;
        monthly += perMonth;
      }
      return {
        id: String(s.id),
        who: s.customer?.name || s.customer?.email || String(s.customer?.id || s.customer || "Onbekend"),
        monthly: Math.round(monthly),
        currency,
        interval,
        status: String(s.status),
        nextCharge: s.current_period_end ? dateOf(Number(s.current_period_end)) : null,
      };
    });
    subscriptions.sort((a, b) => b.monthly - a.monthly);
    return {
      configured: true,
      subscriptions,
      mrr: subscriptions.filter((s) => s.status === "active").reduce((s, x) => s + x.monthly, 0),
      pastDue: subscriptions.filter((s) => s.status === "past_due").length,
    };
  } catch (e) {
    return { configured: true, subscriptions: [], mrr: 0, pastDue: 0, error: safeError(e, "Stripe-abonnementen niet bereikbaar") };
  }
}

export async function getStripePayouts(limit = 6): Promise<{ configured: boolean; payouts: StripePayout[]; error?: string }> {
  if (!KEY) return { configured: false, payouts: [] };
  try {
    const data = await stripeGet("payouts", { limit: String(limit) });
    const payouts: StripePayout[] = (data?.data ?? []).map((p: any) => {
      const currency = String(p.currency || "eur").toLowerCase();
      return {
        id: String(p.id),
        amount: minor(Number(p.amount ?? 0), currency),
        currency,
        arrival: dateOf(Number(p.arrival_date ?? p.created ?? 0)),
        status: String(p.status),
      };
    });
    return { configured: true, payouts };
  } catch (e) {
    return { configured: true, payouts: [], error: safeError(e, "Stripe-uitbetalingen niet bereikbaar") };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
