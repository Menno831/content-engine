import { getTodaysBrief } from "@/lib/data";
import { PageHeader } from "../_components";
import { BriefBoard } from "./BriefBoard";

export default async function BriefPage() {
  const ideas = await getTodaysBrief();
  const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        eyebrow="Daily Brief"
        title="Vandaag's ideeën"
        subtitle={`Verse, kant-en-klare content-ideeën per klant — elke ochtend automatisch klaargezet (${today}). Eén klik en je boost het naar een hele week content.`}
      />
      <BriefBoard ideas={ideas} />
    </>
  );
}
