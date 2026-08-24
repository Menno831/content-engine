import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { ContractsBoard, type ContractRow } from "./ContractsBoard";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ nda?: string }> }) {
  const sp = await searchParams;
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const { clients } = await getWorkspaceData();

  let rows: ContractRow[] = [];
  let migrationMissing = false;
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("contracts")
        .select("id,title,client_id,party,value,recurring,status,starts_on,ends_on,doc_url,sign_token,signed_name,signed_at")
        .order("created_at", { ascending: false });
      if (error) migrationMissing = true;
      else {
        const nameById = new Map(clients.map((c) => [c.id, c.name]));
        rows = (data ?? []).map((r) => ({
          id: r.id as string,
          title: r.title as string,
          clientName: r.client_id ? (nameById.get(r.client_id as string) ?? null) : null,
          party: (r.party as string) ?? null,
          value: Number(r.value ?? 0),
          recurring: Boolean(r.recurring),
          status: (r.status as string) ?? "concept",
          startsOn: (r.starts_on as string) ?? null,
          endsOn: (r.ends_on as string) ?? null,
          docUrl: (r.doc_url as string) ?? null,
          signToken: (r.sign_token as string) ?? null,
          signedName: (r.signed_name as string) ?? null,
          signedAt: (r.signed_at as string) ?? null,
        }));
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Contracten"
        subtitle="Wat er getekend is, wat nog uitstaat en welke afspraken binnenkort aflopen."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — contracten werken in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 026 in Supabase (tabel <code>contracts</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <ContractsBoard initial={rows} clients={clients.map((c) => ({ id: c.id, label: c.name }))} ndaPrefill={sp.nda ?? null} />
      )}
    </>
  );
}
