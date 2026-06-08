// Capture-items (Eden boards): demo-of-echt.
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { captures as demoCaptures, type Capture } from "@/app/platform/_data";

export async function getCaptures(): Promise<Capture[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoCaptures;
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("captures")
    .select("id,board,kind,title,url,body,source")
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    board: c.board ?? "Swipe file",
    kind: (c.kind ?? "link") as Capture["kind"],
    title: c.title,
    url: c.url ?? null,
    body: c.body ?? null,
    source: c.source ?? null,
  }));
}
