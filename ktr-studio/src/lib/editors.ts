// Editor-datalaag: demo-of-echt. Berekent per editor het aantal video's
// deze maand en hoeveel te laat zijn (voor de deductie-berekening).
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { editors as demoEditors, type Editor } from "@/app/platform/_data";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getEditors(): Promise<Editor[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoEditors;
  const supabase = await createClient();
  if (!supabase) return [];

  const [{ data: editorRows }, { data: contentRows }] = await Promise.all([
    supabase.from("editors").select("id,name,pay_per_video,active,specialty,pool_status,contact,portfolio_url,notes").order("active", { ascending: false }),
    supabase.from("content").select("editor_id,stage,deadline,posting_date,published_at,delivered_at"),
  ]);

  const now = new Date();
  const inMonth = (d: any) => {
    if (!d) return false;
    const x = new Date(d);
    return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
  };

  return (editorRows ?? []).map((e) => {
    const mine = (contentRows ?? []).filter((c: any) => c.editor_id === e.id);
    const videosThisMonth = mine.filter(
      (c: any) => c.stage === "posted" && inMonth(c.posting_date ?? c.published_at)
    ).length;
    const lateVideos = mine.filter((c: any) => {
      if (!c.deadline) return false;
      const done = c.delivered_at ?? c.posting_date ?? c.published_at;
      return done && new Date(done) > new Date(c.deadline);
    }).length;
    return {
      id: e.id,
      name: e.name,
      payPerVideo: Number(e.pay_per_video ?? 0),
      active: Boolean(e.active),
      videosThisMonth,
      lateVideos,
      specialty: e.specialty ?? null,
      poolStatus: e.pool_status ?? "actief",
      contact: e.contact ?? null,
      portfolioUrl: e.portfolio_url ?? null,
      notes: e.notes ?? null,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
