// Outreach-prospects: demo-of-echt.
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { prospects as demoProspects, type Prospect } from "@/app/platform/_data";

// Alleen het aantal 'te contacteren' (voor de Vandaag-rij op het dashboard) —
// een head-count, dus zonder de 265 volledige rijen op te halen.
export async function getOutreachTodoCount(): Promise<number> {
  if (DEMO_MODE || !isSupabaseConfigured) {
    return demoProspects.filter((p) => p.stage === "te_contacteren").length;
  }
  const supabase = await createClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("stage", "te_contacteren");
  return count ?? 0;
}

export async function getProspects(): Promise<Prospect[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoProspects;
  const supabase = await createClient();
  if (!supabase) return [];

  // message apart proberen: bestaat de kolom nog niet (migratie 021 niet
  // gedraaid), dan valt de pagina terug op de basiskolommen.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const base = "id,name,instagram,youtube,weakness,stage,potential_value,note";
  let data: any[] | null = null;
  const first = await supabase
    .from("prospects")
    .select(`${base},message,dm_sent_at,tier`)
    .order("created_at", { ascending: false });
  if (first.error) {
    // Migratie 023 (dm_sent_at) nog niet gedraaid? Probeer met alleen message;
    // daarna desnoods puur de basiskolommen (pre-021).
    // Migratie 032 (tier) of 023 (dm_sent_at) nog niet gedraaid.
    const second = await supabase.from("prospects").select(`${base},message,dm_sent_at`).order("created_at", { ascending: false });
    if (second.error) {
      const fallback = await supabase.from("prospects").select(base).order("created_at", { ascending: false });
      data = fallback.data;
    } else {
      data = second.data;
    }
  } else {
    data = first.data;
  }

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    instagram: p.instagram ?? null,
    youtube: p.youtube ?? null,
    weakness: p.weakness ?? null,
    stage: (p.stage ?? "te_contacteren") as Prospect["stage"],
    potentialValue: Number(p.potential_value ?? 0),
    note: p.note ?? null,
    dmSentAt: p.dm_sent_at ?? null,
    message: p.message ?? null,
    tier: p.tier ?? null,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
