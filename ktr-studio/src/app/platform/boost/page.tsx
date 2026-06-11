import { getWorkspaceData } from "@/lib/data";
import { getCaptures } from "@/lib/captures";
import { PageHeader } from "../_components";
import { NotConnected } from "../_states";
import { BoostClient } from "./BoostClient";

export default async function BoostPage() {
  const { clients } = await getWorkspaceData();
  const captures = await getCaptures();

  if (clients.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Boost · AI"
          title="Eén idee → een week content"
          subtitle="Voeg eerst een klant toe — Boost schrijft in de brand voice van de gekozen klant."
        />
        <NotConnected provider="Boost">Nog geen klanten.</NotConnected>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Boost · AI"
        title="Eén idee → een week content"
        subtitle="Gooi één concept, winnende hook of bewaard item erin en zet het in één klik om naar Reel, carrousel, story, LinkedIn, X-thread en YouTube — allemaal in de brand voice van je klant."
      />
      <BoostClient
        clients={clients.map((c) => ({ id: c.id, name: c.name, handle: c.handle }))}
        saved={captures
          .filter((c) => c.body || c.title)
          .slice(0, 40)
          .map((c) => ({ id: c.id, label: `${c.title}${c.source ? ` · ${c.source}` : ""}`, text: c.body || c.title }))}
      />
    </>
  );
}
