// ════════════════════════════════════════════════════════════════
// Wisselkoers USD → EUR. Klanten die in dollars betalen staan in hun
// eigen valuta in de database; alleen voor de totalen (MRR, marge,
// omzet) rekenen we om. Koers van de ECB via frankfurter.app, één keer
// per dag opgehaald. Geen internet of storing? Dan de laatst bekende
// vaste koers — beter een cijfer dat een paar procent afwijkt dan een
// pagina die leeg blijft.
// ════════════════════════════════════════════════════════════════
const FALLBACK_USD_EUR = 0.92;

export async function usdToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", { next: { revalidate: 86_400 } });
    if (!res.ok) return FALLBACK_USD_EUR;
    const json = (await res.json()) as { rates?: { EUR?: number } };
    const rate = Number(json.rates?.EUR);
    // Sanity: de koers zweeft al jaren tussen 0,7 en 1,1.
    return rate > 0.5 && rate < 1.5 ? rate : FALLBACK_USD_EUR;
  } catch {
    return FALLBACK_USD_EUR;
  }
}

/** Bedrag in de valuta van de klant → euro's, voor optellen. */
export function toEur(amount: number, currency: string | null | undefined, usdRate: number): number {
  return (currency ?? "EUR").toUpperCase() === "USD" ? amount * usdRate : amount;
}

/** Bedrag netjes met het juiste teken, zonder om te rekenen. */
export function fmtMoney(amount: number, currency: string | null | undefined): string {
  const symbol = (currency ?? "EUR").toUpperCase() === "USD" ? "$" : "€";
  return `${symbol}${Math.round(amount).toLocaleString("nl-NL")}`;
}
