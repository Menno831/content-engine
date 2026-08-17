// Outreach-prospects: demo-of-echt.
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { prospects as demoProspects, type Prospect } from "@/app/platform/_data";

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
    .select(`${base},message`)
    .order("created_at", { ascending: false });
  if (first.error) {
    const fallback = await supabase.from("prospects").select(base).order("created_at", { ascending: false });
    data = fallback.data;
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
    message: p.message ?? null,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
