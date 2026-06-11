import { PageHeader } from "../_components";
import { getWorkspaceData, getGenerations } from "@/lib/data";
import { isHiggsfieldConfigured } from "@/lib/config";
import { VisualsStudio } from "./VisualsStudio";
import { NotConnected } from "../_states";

export default async function VisualsPage() {
  const [{ clients }, history] = await Promise.all([getWorkspaceData(), getGenerations(24)]);
  const visualClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    soulCharacter: c.soulCharacter,
    referenceImage: c.referenceImage,
    brandPrompt: c.brandPrompt,
  }));

  return (
    <>
      <PageHeader
        eyebrow="AI Thumbnails · Soul"
        title="Thumbnails in het vaste character van je klant"
        subtitle="Kies een klant — het Soul-character, de brand-prompt en de brand-kleuren gaan automatisch mee. Vier varianten per generatie."
      />
      {visualClients.length === 0 ? (
        <NotConnected provider="AI Visuals">Voeg eerst een klant toe om een Soul-character te koppelen.</NotConnected>
      ) : (
        <VisualsStudio clients={visualClients} configured={isHiggsfieldConfigured} history={history} />
      )}
    </>
  );
}
