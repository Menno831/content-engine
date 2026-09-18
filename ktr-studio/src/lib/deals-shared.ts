// ════════════════════════════════════════════════════════════════
// Deals in de pijplijn. De kans hangt aan de fase — zo hoef je niets
// extra in te schatten en is de vooruitblik toch eerlijk: een voorstel
// dat er ligt is geen omzet, maar ook geen nul.
// ════════════════════════════════════════════════════════════════

export const DEAL_STAGES = ["gesprek", "voorstel", "mondeling_ja", "gewonnen", "verloren"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_META: Record<DealStage, { label: string; kans: number; color: string }> = {
  gesprek: { label: "Gesprek gehad", kans: 0.25, color: "#60A5FA" },
  voorstel: { label: "Voorstel ligt er", kans: 0.5, color: "#FBBF24" },
  mondeling_ja: { label: "Mondeling ja", kans: 0.8, color: "#34D399" },
  gewonnen: { label: "Gewonnen", kans: 1, color: "#34D399" },
  verloren: { label: "Verloren", kans: 0, color: "#6B7280" },
};

export interface Deal {
  id: string;
  name: string;
  monthlyValue: number;
  currency: string;
  stage: DealStage;
  startsMonth: string | null; // YYYY-MM
  note: string | null;
}

/** Gewogen maandwaarde van de pijplijn voor één maand (YYYY-MM), in euro. */
export function pipelineFor(deals: Deal[], month: string, usdRate: number): number {
  return deals
    .filter((d) => d.stage !== "gewonnen" && d.stage !== "verloren")
    .filter((d) => !d.startsMonth || d.startsMonth <= month)
    .reduce((s, d) => {
      const eur = d.currency.toUpperCase() === "USD" ? d.monthlyValue * usdRate : d.monthlyValue;
      return s + eur * DEAL_META[d.stage].kans;
    }, 0);
}

/** Als álles doorgaat: alle open deals voor 100%, in euro. */
export function pipelineMax(deals: Deal[], month: string, usdRate: number): number {
  return deals
    .filter((d) => d.stage !== "gewonnen" && d.stage !== "verloren")
    .filter((d) => !d.startsMonth || d.startsMonth <= month)
    .reduce((s, d) => s + (d.currency.toUpperCase() === "USD" ? d.monthlyValue * usdRate : d.monthlyValue), 0);
}
