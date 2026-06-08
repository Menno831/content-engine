import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { isHiggsfieldConfigured } from "@/lib/config";
import { VisualsStudio } from "./VisualsStudio";
import { NotConnected } from "../_states";

export default async function VisualsPage() {
  const { clients } = await getWorkspaceData();
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
        eyebrow="AI Visuals · Soul"
        title="Genereer met het character van je klant"
        subtitle="Kies een klant, het Soul-character + brand-prompt staan klaar — jij geeft alleen de prompt. Bespaart credits en tijd."
      />
      {visualClients.length === 0 ? (
        <NotConnected provider="AI Visuals">Voeg eerst een klant toe om een Soul-character te koppelen.</NotConnected>
      ) : (
        <VisualsStudio clients={visualClients} configured={isHiggsfieldConfigured} />
      )}
    </>
  );
}
