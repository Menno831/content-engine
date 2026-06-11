import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { BrandStudio } from "./BrandStudio";
import { NotConnected } from "../_states";

export default async function BrandStudioPage() {
  const { clients } = await getWorkspaceData();

  if (clients.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Brand Studio"
          title="Carousels & stories in de huisstijl"
          subtitle="Voeg eerst een klant toe — de kleuren en handle komen van het klantprofiel."
        />
        <NotConnected provider="Brand Studio">Nog geen klanten.</NotConnected>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Brand Studio"
        title="Carousels & stories in de huisstijl"
        subtitle="Drop een foto, plak je tekst en exporteer kant-en-klare slides op volledige resolutie — automatisch in de brand-kleuren van de klant."
      />
      <BrandStudio
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          brandPrimary: c.brandPrimary ?? null,
          brandSecondary: c.brandSecondary ?? null,
        }))}
      />
    </>
  );
}
