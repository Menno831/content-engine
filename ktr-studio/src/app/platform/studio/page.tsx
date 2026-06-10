import { getWorkspaceData } from "@/lib/data";
import { StudioClient } from "./StudioClient";
import { PageHeader } from "../_components";
import { NotConnected } from "../_states";

export default async function StudioPage() {
  const { clients } = await getWorkspaceData();

  if (clients.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Studio · AI"
          title="Hook & script generator"
          subtitle="Voeg eerst een klant toe — de generator schrijft in de brand voice van de gekozen klant."
        />
        <NotConnected provider="Studio">
          Nog geen klanten. Voeg een klant toe en leg de brand voice vast op het klantprofiel.
        </NotConnected>
      </>
    );
  }

  return (
    <StudioClient
      clients={clients.map((c) => ({ id: c.id, name: c.name, handle: c.handle }))}
    />
  );
}
