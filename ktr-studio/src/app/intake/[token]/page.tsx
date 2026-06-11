import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeForm } from "./IntakeForm";

export const metadata = { title: "Brand intake — KTR Studio" };

/**
 * Publieke intake-pagina: de klant vult hier zelf de brand voice-vragen
 * in via een deelbare link (token). Geen login nodig — het token ís de
 * toegang. Lookup gaat via de service-role (RLS geldt niet voor anoniem).
 */
export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: client } = admin
    ? await admin.from("clients").select("id, name, intake_answers").eq("intake_token", token).maybeSingle()
    : { data: null };

  if (!client) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display font-extrabold text-2xl mb-2">Link niet (meer) geldig</h1>
          <p className="text-muted text-sm">
            Deze intake-link bestaat niet of is verlopen. Vraag een nieuwe link aan bij je contactpersoon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-px w-6 bg-accent/60" />
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">Brand intake</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl mb-3">Hoi {client.name.split(" ")[0]} 👋</h1>
        <p className="text-muted leading-relaxed mb-8">
          Met deze 10 vragen leggen we vast hoe jij praat, denkt en klinkt — zodat alle content die we
          voor je maken écht als jou voelt. Schrijf zoals je praat, niet zoals je &ldquo;hoort te schrijven&rdquo;.
          Hoe eerlijker en concreter, hoe beter het resultaat.
        </p>
        <IntakeForm
          token={token}
          answers={(client.intake_answers as Record<string, string> | null) ?? {}}
        />
      </div>
    </main>
  );
}
