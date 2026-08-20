import { getClient } from "@/lib/data";
import { HealthPanel } from "./HealthPanel";

// Health-tab: gezondheid van de relatie + beheerinstellingen.
export default async function ClientHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getClient(id);
  if (!c) return null;
  return (
    <HealthPanel
      clientId={id}
      health={c.health ?? null}
      healthNote={c.healthNote ?? null}
      manager={c.manager ?? null}
      hidden={Boolean(c.hidden)}
      status={c.status}
    />
  );
}
