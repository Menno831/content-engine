import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { getMeetings } from "@/lib/workspace";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { CallsBoard } from "../clients/[id]/calls/CallsBoard";

// Agenda: alle calls over alle klanten heen.
export default async function AgendaPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const meetings = demo ? [] : await getMeetings({ limit: 200 });

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Calls & afspraken"
        subtitle="Alles wat gepland staat, met klant erbij — en achteraf of het gehouden is, verzet of een no-show."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — de agenda werkt in de echte omgeving.</p>
      ) : (
        <CallsBoard clientId={null} initial={meetings} />
      )}
    </>
  );
}
