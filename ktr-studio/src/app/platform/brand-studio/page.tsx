import { PageHeader } from "../_components";
import { getSessionContext } from "@/lib/auth";
import { BrandStudio } from "./BrandStudio";

export default async function BrandStudioPage() {
  const ctx = await getSessionContext();
  const brandName = ctx.agency?.brand_name || "KTR Studio";

  return (
    <>
      <PageHeader
        eyebrow="Brand Studio"
        title="Tekst naar merk-content"
        subtitle="Plak een script, offer of testimonial en zet het direct om naar carrousel-slides in jouw huisstijl. Exporteer als PDF."
      />
      <BrandStudio brandName={brandName} />
    </>
  );
}
