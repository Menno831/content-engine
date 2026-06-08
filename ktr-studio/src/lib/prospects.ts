// Outreach-prospects: demo-of-echt.
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { prospects as demoProspects, type Prospect } from "@/app/platform/_data";

export async function getProspects(): Promise<Prospect[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoProspects;
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("prospects")
    .select("id,name,instagram,youtube,weakness,stage,potential_value,note")
    .order("created_at", { ascending: false });

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    instagram: p.instagram ?? null,
    youtube: p.youtube ?? null,
    weakness: p.weakness ?? null,
    stage: (p.stage ?? "te_contacteren") as Prospect["stage"],
    potentialValue: Number(p.potential_value ?? 0),
    note: p.note ?? null,
  }));
}
