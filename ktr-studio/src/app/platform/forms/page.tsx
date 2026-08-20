import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { FormsBoard, type FormRow } from "./FormsBoard";

// Formulieren: publieke leadpagina's die leads in de CRM zetten.
export default async function FormsPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const { clients } = await getWorkspaceData();

  let forms: FormRow[] = [];
  let migrationMissing = false;
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("lead_forms")
        .select("id,name,token,client_id,active,submissions")
        .order("created_at", { ascending: false });
      if (error) migrationMissing = true;
      else {
        const nameById = new Map(clients.map((c) => [c.id, c.name]));
        forms = (data ?? []).map((f) => ({
          id: f.id as string,
          name: f.name as string,
          token: f.token as string,
          clientId: (f.client_id as string) ?? null,
          clientName: f.client_id ? (nameById.get(f.client_id as string) ?? null) : null,
          active: Boolean(f.active),
          submissions: Number(f.submissions ?? 0),
        }));
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Leadformulieren"
        subtitle="Een deelbare pagina per aanbod — inzendingen komen automatisch binnen als lead bij de juiste klant."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — formulieren werken in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 026 in Supabase (tabel <code>lead_forms</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <FormsBoard initial={forms} clients={clients.map((c) => ({ id: c.id, label: c.name }))} />
      )}
    </>
  );
}
