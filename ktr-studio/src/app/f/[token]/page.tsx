import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LeadForm } from "./LeadForm";

export const dynamic = "force-dynamic";

// Publieke leadpagina. Onraadbare token; niet indexeerbaar.
export const metadata = { robots: { index: false, follow: false } };

export default async function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: form } = await admin
    .from("lead_forms")
    .select("headline,intro,button_label,ask_phone,ask_instagram,active")
    .eq("token", token)
    .maybeSingle();
  if (!form) notFound();

  return (
    <main className="min-h-screen grid place-items-center px-5 py-16">
      <div className="w-full max-w-md">
        <h1 className="font-display font-extrabold text-3xl mb-2">{form.headline ?? "Laat je gegevens achter"}</h1>
        {form.intro && <p className="text-muted mb-6 leading-relaxed">{form.intro}</p>}

        {form.active ? (
          <LeadForm
            token={token}
            buttonLabel={(form.button_label as string) ?? "Versturen"}
            askPhone={Boolean(form.ask_phone)}
            askInstagram={Boolean(form.ask_instagram)}
          />
        ) : (
          <div className="rounded-2xl border border-white/[0.08] px-6 py-8 text-center">
            <p className="text-muted text-sm">Dit formulier is gesloten.</p>
          </div>
        )}

        <p className="text-[11.5px] text-muted mt-8 text-center">Je gegevens worden alleen gebruikt om contact op te nemen.</p>
      </div>
    </main>
  );
}
