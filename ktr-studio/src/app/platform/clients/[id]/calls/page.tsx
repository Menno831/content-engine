import { getClient } from "@/lib/data";
import { getMeetings } from "@/lib/workspace";
import { CallsBoard } from "./CallsBoard";

// Calls-tab: alle gesprekken met deze klant.
export default async function ClientCallsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, meetings] = await Promise.all([getClient(id), getMeetings({ clientId: id })]);
  if (!c) return null;
  return <CallsBoard clientId={id} clientName={c.name} initial={meetings} />;
}
