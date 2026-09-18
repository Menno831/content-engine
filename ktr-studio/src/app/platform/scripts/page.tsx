import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { type ScriptRow } from "./ScriptsBoard";
import { ScriptsTabs } from "./ScriptsTabs";
import { getIdeas } from "@/lib/ideas";

// Scripts-bibliotheek: alles wat eerst los op mennokater.nl stond.
// Nog schrijven → klaar om op te nemen → opgenomen, met inline autosave.
export default async function ScriptsPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const ideasData = await getIdeas();

  let scripts: ScriptRow[] = [];
  let clients: { id: string; name: string }[] = [];
  let migrationMissing = false;

  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const [scriptsRes, clientsRes] = await Promise.all([
        supabase
          .from("scripts")
          .select("id,title,content,status,tag,location,review_note,client_id,updated_at")
          .order("updated_at", { ascending: false }),
        supabase.from("clients").select("id,name").order("name"),
      ]);
      if (scriptsRes.error) {
        migrationMissing = true;
      } else {
        scripts = (scriptsRes.data ?? []) as ScriptRow[];
      }
      clients = clientsRes.data ?? [];
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Scripts"
        subtitle="Je scripts én de ideeën waar ze uit komen — gehaald uit je eigen calls en gesprekken. Wijzigingen worden automatisch opgeslagen."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — scripts verschijnen hier in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai eerst migratie 022/023 in Supabase (tabel <code>scripts</code> + locatie/review-velden) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <ScriptsTabs
          scripts={scripts}
          clients={clients}
          ideas={ideasData.ideas}
          sources={ideasData.sources}
          ideasMissing={ideasData.migrationMissing}
        />
      )}
    </>
  );
}
