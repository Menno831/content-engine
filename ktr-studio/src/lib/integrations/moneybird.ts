// ════════════════════════════════════════════════════════════════
// Moneybird-koppeling (alleen-lezen): facturen van deze maand, zodat
// Finance laat zien wat er echt binnenkomt — gefactureerd, betaald en
// openstaand per klant. Geen schrijfacties: Moneybird blijft de bron.
//
// Nodig in Vercel:
//   MONEYBIRD_API_TOKEN            (Moneybird → Instellingen → Ontwikkelaars → API-token)
//   MONEYBIRD_ADMINISTRATION_ID    (het cijfer in de URL als je in Moneybird ingelogd bent)
// ════════════════════════════════════════════════════════════════

// Waarden schoonmaken: een spatie of regeleinde uit het kopiëren, een dubbel
// geplakte token, of een geplakte URL i.p.v. alleen het nummer, mag de
// koppeling niet breken.
const TOKEN = (process.env.MONEYBIRD_API_TOKEN || "").trim().split(/\s+/)[0] || "";
const ADMINISTRATION_ID = (process.env.MONEYBIRD_ADMINISTRATION_ID || "").replace(/\D/g, "");

export const moneybirdConfigured = () => Boolean(TOKEN && ADMINISTRATION_ID);

export interface MoneybirdInvoice {
  id: string;
  contact: string;
  reference: string | null;
  state: string; // open | pending_payment | late | paid | …
  totalExcl: number;
  totalIncl: number;
  invoiceDate: string | null;
  dueDate: string | null;
}

export interface MoneybirdMonth {
  configured: boolean;
  invoices: MoneybirdInvoice[];
  invoiced: number; // excl. btw, alles behalve concepten
  paid: number;
  open: number;
  error?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// month als "YYYY-MM" voor een specifieke maand; weggelaten = deze maand.
export async function getMoneybirdMonth(month?: string): Promise<MoneybirdMonth> {
  if (!moneybirdConfigured()) {
    return { configured: false, invoices: [], invoiced: 0, paid: 0, open: 0 };
  }

  let period = "this_month";
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    period = `${y}${mm}01..${y}${mm}${String(last).padStart(2, "0")}`;
  }

  try {
    const res = await fetch(
      `https://moneybird.com/api/v2/${ADMINISTRATION_ID}/sales_invoices.json?filter=${encodeURIComponent(`period:${period}`)}&per_page=100`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        // Facturen veranderen niet per minuut — 10 min cache houdt Finance snel.
        next: { revalidate: 600 },
      }
    );
    if (!res.ok) {
      const why = res.status === 401 ? "token ongeldig" : res.status === 404 ? "administratie-id klopt niet" : `status ${res.status}`;
      return { configured: true, invoices: [], invoiced: 0, paid: 0, open: 0, error: `Moneybird: ${why}` };
    }
    const rows: any[] = await res.json();

    const invoices: MoneybirdInvoice[] = rows
      .filter((r) => r.state !== "draft")
      .map((r) => ({
        id: String(r.id),
        contact:
          r.contact?.company_name ||
          [r.contact?.firstname, r.contact?.lastname].filter(Boolean).join(" ") ||
          "Onbekend",
        reference: r.reference || r.invoice_id || null,
        state: String(r.state ?? "open"),
        totalExcl: Number(r.total_price_excl_tax ?? 0),
        totalIncl: Number(r.total_price_incl_tax ?? 0),
        invoiceDate: r.invoice_date ?? null,
        dueDate: r.due_date ?? null,
      }));

    const invoiced = invoices.reduce((s, i) => s + i.totalExcl, 0);
    const paid = invoices.filter((i) => i.state === "paid").reduce((s, i) => s + i.totalExcl, 0);

    return { configured: true, invoices, invoiced, paid, open: invoiced - paid };
  } catch (e) {
    let why = e instanceof Error ? e.message : "onbekende fout";
    // De token mag nooit in een foutmelding op het scherm belanden.
    if (TOKEN) why = why.split(TOKEN).join("•••");
    return { configured: true, invoices: [], invoiced: 0, paid: 0, open: 0, error: `Moneybird niet bereikbaar (${why}).` };
  }
}

// ── Concepten: wat er nog verstuurd moet worden ─────────────────
// Menno maakt facturen eerst als concept in Moneybird; pas bij versturen
// tellen ze mee in de omzet. Concepten hebben nog geen factuurdatum, dus
// het periode-filter mist ze — daarom een eigen query op state:draft.
export interface MoneybirdDrafts {
  configured: boolean;
  drafts: MoneybirdInvoice[];
  total: number; // excl. btw
  error?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getMoneybirdDrafts(): Promise<MoneybirdDrafts> {
  if (!moneybirdConfigured()) return { configured: false, drafts: [], total: 0 };
  try {
    const res = await fetch(
      `https://moneybird.com/api/v2/${ADMINISTRATION_ID}/sales_invoices.json?filter=${encodeURIComponent("state:draft")}&per_page=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` }, next: { revalidate: 600 } }
    );
    if (!res.ok) {
      return { configured: true, drafts: [], total: 0, error: `Moneybird-concepten: status ${res.status}` };
    }
    const rows: any[] = await res.json();
    const drafts: MoneybirdInvoice[] = rows.map((r) => ({
      id: String(r.id),
      contact:
        r.contact?.company_name ||
        [r.contact?.firstname, r.contact?.lastname].filter(Boolean).join(" ") ||
        "Onbekend",
      reference: r.reference || null,
      state: "draft",
      totalExcl: Number(r.total_price_excl_tax ?? 0),
      totalIncl: Number(r.total_price_incl_tax ?? 0),
      invoiceDate: r.invoice_date ?? null,
      dueDate: r.due_date ?? null,
    }));
    return { configured: true, drafts, total: drafts.reduce((s, d) => s + d.totalExcl, 0) };
  } catch (e) {
    let why = e instanceof Error ? e.message : "onbekende fout";
    if (TOKEN) why = why.split(TOKEN).join("•••");
    return { configured: true, drafts: [], total: 0, error: `Moneybird niet bereikbaar (${why}).` };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Bankmutaties: wat er echt uitgaat (alleen-lezen) ────────────
// Menno's bank hangt al aan Moneybird; hiermee zien we de uitgaven
// zonder aparte bankkoppeling. Alleen uitgaand geld (amount < 0).
export interface MoneybirdMutation {
  id: string;
  date: string | null;
  amount: number;        // negatief = uitgave
  party: string;         // tegenpartij
  description: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getMoneybirdMutations(days = 45): Promise<{ configured: boolean; mutations: MoneybirdMutation[]; error?: string }> {
  if (!moneybirdConfigured()) return { configured: false, mutations: [] };
  try {
    const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    const to = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const res = await fetch(
      `https://moneybird.com/api/v2/${ADMINISTRATION_ID}/financial_mutations.json?filter=${encodeURIComponent(`period:${from}..${to}`)}&per_page=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` }, next: { revalidate: 600 } }
    );
    if (!res.ok) return { configured: true, mutations: [], error: `Moneybird-mutaties: status ${res.status}` };
    const rows: any[] = await res.json();
    const mutations: MoneybirdMutation[] = rows
      .map((r) => ({
        id: String(r.id),
        date: r.date ?? null,
        amount: Number(r.amount ?? 0),
        party: String(r.contra_account_name || r.batch_reference || "Onbekend"),
        description: String(r.message || "").slice(0, 140),
      }))
      .filter((m) => m.amount < 0)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return { configured: true, mutations };
  } catch (e) {
    let why = e instanceof Error ? e.message : "onbekende fout";
    if (TOKEN) why = why.split(TOKEN).join("•••");
    return { configured: true, mutations: [], error: `Moneybird niet bereikbaar (${why}).` };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
