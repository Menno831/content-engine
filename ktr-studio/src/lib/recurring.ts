// ════════════════════════════════════════════════════════════════
// Vaste lasten herkennen in bankmutaties (ABN/Revolut via Moneybird):
// dezelfde tegenpartij, in minstens twee verschillende maanden, met
// een bedrag dat binnen ±15% gelijk blijft. Wat al als vaste last
// staat, of al gelabeld is, komt niet nog een keer terug.
// ════════════════════════════════════════════════════════════════
import type { MoneybirdMutation } from "@/lib/integrations/moneybird";

export interface RecurringSuggestion {
  party: string;
  amount: number;        // typisch maandbedrag (mediaan, positief)
  months: string[];      // YYYY-MM waarin het voorkwam
  lastDate: string | null;
  mutationIds: string[];
  dates: (string | null)[];
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\b(bv|b\.v\.|inc|ltd|llc|payments?|europe|ireland|ie|uk|nl)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function findRecurring(
  mutations: MoneybirdMutation[],
  knownFixedNames: string[],
  labeledIds: Set<string>
): RecurringSuggestion[] {
  const known = knownFixedNames.map(norm).filter(Boolean);
  const byParty = new Map<string, MoneybirdMutation[]>();
  for (const m of mutations) {
    if (m.amount >= 0) continue;
    const key = norm(m.party);
    if (!key || key === "onbekend") continue;
    (byParty.get(key) ?? byParty.set(key, []).get(key)!).push(m);
  }

  const out: RecurringSuggestion[] = [];
  for (const [key, list] of byParty) {
    if (known.some((k) => key.includes(k) || k.includes(key))) continue;
    const months = [...new Set(list.map((m) => (m.date ?? "").slice(0, 7)).filter(Boolean))].sort();
    if (months.length < 2) continue;
    const amounts = list.map((m) => Math.abs(m.amount)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const stable = amounts.filter((a) => Math.abs(a - median) / median <= 0.15).length >= Math.max(2, Math.ceil(amounts.length * 0.6));
    if (!stable || median < 2) continue;
    const unlabeled = list.filter((m) => !labeledIds.has(m.id));
    if (unlabeled.length === 0) continue;
    out.push({
      party: list[0].party,
      amount: Math.round(median * 100) / 100,
      months,
      lastDate: list.map((m) => m.date ?? "").sort().pop() || null,
      mutationIds: unlabeled.map((m) => m.id),
      dates: unlabeled.map((m) => m.date),
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
