// Serverkant van de pijplijn: types en rekenwerk staan in deals-shared.ts
// zodat de client-component ze kan gebruiken zonder next/headers mee te slepen.
import { createClient } from "@/lib/supabase/server";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/deals-shared";

export * from "@/lib/deals-shared";

export async function getDeals(): Promise<Deal[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("deals")
    .select("id,name,monthly_value,currency,stage,starts_month,note")
    .order("created_at");
  if (error) return [];
  return (data ?? []).map((d) => ({
    id: String(d.id),
    name: String(d.name),
    monthlyValue: Number(d.monthly_value ?? 0),
    currency: (d.currency as string) ?? "EUR",
    stage: (DEAL_STAGES.includes(d.stage as DealStage) ? d.stage : "gesprek") as DealStage,
    startsMonth: d.starts_month ? String(d.starts_month).slice(0, 7) : null,
    note: (d.note as string) ?? null,
  }));
}
