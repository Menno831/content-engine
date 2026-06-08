import { PageHeader } from "../_components";
import { getSessionContext } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  const brandName = ctx.agency?.brand_name || "KTR Studio";
  const accent = ctx.agency?.accent || "#F97316";

  return (
    <>
      <PageHeader
        eyebrow="Instellingen"
        title="White-label & merk"
        subtitle="Stel je merknaam en accentkleur in. Dit kleurt het hele platform — ook de klantportalen."
      />
      <SettingsForm brandName={brandName} accent={accent} />
    </>
  );
}
