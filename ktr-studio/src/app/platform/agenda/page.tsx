import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { getMeetings } from "@/lib/workspace";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { CallsBoard } from "../clients/[id]/calls/CallsBoard";
import { CalendarCard } from "./CalendarCard";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

// Agenda: alle calls over alle klanten heen.
export default async function AgendaPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const meetings = demo ? [] : await getMeetings({ limit: 200 });
  let icsUrl = "";
  let syncedAt: string | null = null;
  // Eenmalig ingelezen afspraken (via de Google-koppeling in de chat) tellen
  // we apart: dan weet de kaart dat er al iets staat, maar nog niets automatisch.
  let manualCount = 0;
  if (!demo) {
    const supabase = await createClient();
    const { agency } = await getSessionContext();
    if (supabase && agency) {
      const { data } = await supabase.from("agencies").select("calendar_ics_url, calendar_synced_at").eq("id", agency.id).maybeSingle();
      icsUrl = (data?.calendar_ics_url as string) ?? "";
      syncedAt = (data?.calendar_synced_at as string) ?? null;
      const { count } = await supabase.from("meetings").select("id", { count: "exact", head: true }).eq("source", "google-mcp");
      manualCount = count ?? 0;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Calls & afspraken"
        subtitle="Je Google Agenda en je calls op één plek — wat er vandaag staat, wat gedaan is, en per call of het gehouden is, verzet of een no-show."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — de agenda werkt in de echte omgeving.</p>
      ) : (
        <>
          <CalendarCard icsUrl={icsUrl} syncedAt={syncedAt} manualCount={manualCount} />
          <CallsBoard clientId={null} initial={meetings} />
        </>
      )}
    </>
  );
}
