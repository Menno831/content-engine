// ════════════════════════════════════════════════════════════════
// Moneybird-koppeling (alleen-lezen): facturen van deze maand, zodat
// Finance laat zien wat er echt binnenkomt — gefactureerd, betaald en
// openstaand per klant. Geen schrijfacties: Moneybird blijft de bron.
//
// Nodig in Vercel:
//   MONEYBIRD_API_TOKEN            (Moneybird → Instellingen → Ontwikkelaars → API-token)
//   MONEYBIRD_ADMINISTRATION_ID    (het cijfer in de URL als je in Moneybird ingelogd bent)
// ════════════════════════════════════════════════════════════════

// Waarden schoonmaken: een spatie of regeleinde uit het kopiëren, of een
// geplakte URL i.p.v. alleen het nummer, mag de koppeling niet breken.
const TOKEN = (process.env.MONEYBIRD_API_TOKEN || "").trim();
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

export async function getMoneybirdMonth(): Promise<MoneybirdMonth> {
  if (!moneybirdConfigured()) {
    return { configured: false, invoices: [], invoiced: 0, paid: 0, open: 0 };
  }

  try {
    const res = await fetch(
      `https://moneybird.com/api/v2/${ADMINISTRATION_ID}/sales_invoices.json?filter=${encodeURIComponent("period:this_month")}&per_page=100`,
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
    const why = e instanceof Error ? e.message : "onbekende fout";
    return { configured: true, invoices: [], invoiced: 0, paid: 0, open: 0, error: `Moneybird niet bereikbaar (${why}).` };
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
