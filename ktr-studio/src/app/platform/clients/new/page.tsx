import Link from "next/link";
import { PageHeader } from "../../_components";
import { OnboardWizard } from "../OnboardWizard";

export default function NewClientPage() {
  return (
    <>
      <Link href="/platform/clients" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground mb-4 transition-colors">
        ← Klanten
      </Link>
      <PageHeader
        eyebrow="Onboarding"
        title="Nieuwe klant"
        subtitle="Eén vloeiende flow: gegevens, kanalen, kleuren en brand voice. Sla stappen gerust over — je kunt later alles aanvullen."
      />
      <OnboardWizard />
    </>
  );
}
