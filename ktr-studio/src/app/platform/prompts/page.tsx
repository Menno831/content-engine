import { PageHeader } from "../_components";
import { promptTemplates } from "../_data";
import { PromptsLab } from "./PromptsLab";

export default function PromptsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prompts"
        title="Prompt-bibliotheek"
        subtitle="Bewaarde, herbruikbare AI-prompts per categorie. Vul je input in en draai 'm — klaar om aan Claude te koppelen."
      />
      <PromptsLab templates={promptTemplates} />
    </>
  );
}
