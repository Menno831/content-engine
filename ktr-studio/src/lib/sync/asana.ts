// ════════════════════════════════════════════════════════════════
// Sync: Asana-project van een klant → kaarten op ons productieboard.
// Nieuwe taken worden kaarten; bestaande kaarten (herkenbaar aan
// external_id 'asana:<gid>') volgen de sectie/fase en deadline uit
// Asana. Draait mee met de 3x-daagse cron én de Sync-knop.
// ════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAsanaProject, asanaConfigured } from "@/lib/integrations/asana";

export interface AsanaSyncResult {
  ok: boolean;
  items?: number;
  error?: string;
}

export async function syncClientAsana(clientId: string): Promise<AsanaSyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "geen_serverkey" };

  const { data: client } = await admin
    .from("clients")
    .select("id, asana_project_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client?.asana_project_id) return { ok: false, error: "geen_bron" };
  if (!asanaConfigured()) return { ok: false, error: "ASANA_TOKEN ontbreekt" };

  let tasks;
  try {
    tasks = await fetchAsanaProject(client.asana_project_id as string);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "asana-fout" };
  }

  // Bestaande Asana-kaarten van deze klant in één keer ophalen.
  const { data: existing } = await admin
    .from("content")
    .select("id, external_id, stage, deadline, title")
    .eq("client_id", clientId)
    .like("external_id", "asana:%");
  const byGid = new Map((existing ?? []).map((r) => [String(r.external_id), r]));

  let touched = 0;
  for (const t of tasks) {
    const key = `asana:${t.gid}`;
    const row = byGid.get(key);
    if (!row) {
      const { error } = await admin.from("content").insert({
        client_id: clientId,
        title: t.name,
        stage: t.stage,
        deadline: t.dueOn,
        permalink: t.permalink,
        external_id: key,
        format: "Longform",
      });
      if (!error) touched++;
    } else if (row.stage !== t.stage || row.deadline !== t.dueOn || row.title !== t.name) {
      // Asana is leidend bij de pull: fase, deadline en titel volgen mee.
      const { error } = await admin
        .from("content")
        .update({ title: t.name, stage: t.stage, deadline: t.dueOn })
        .eq("id", row.id);
      if (!error) touched++;
    }
  }

  return { ok: true, items: touched };
}
