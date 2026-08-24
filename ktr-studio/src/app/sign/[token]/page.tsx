import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignForm } from "./SignForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Publieke ondertekenpagina: onraadbare token, alleen dit ene document.
export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: doc } = await admin
    .from("contracts")
    .select("title, doc_body, signed_name, signed_at")
    .eq("sign_token", token)
    .maybeSingle();
  if (!doc || !doc.doc_body) notFound();

  return (
    <main className="min-h-screen px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="font-mono text-[11px] uppercase tracking-wider text-accent mb-1">KTR Studio</div>
          <h1 className="font-display font-extrabold text-2xl">{doc.title}</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 mb-6">
          <pre className="whitespace-pre-wrap font-[inherit] text-[13.5px] leading-relaxed text-foreground/90">{doc.doc_body}</pre>
        </div>

        {doc.signed_at ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-6 py-5">
            <p className="font-display font-extrabold">✓ Ondertekend</p>
            <p className="text-muted text-sm mt-1">
              Door {doc.signed_name} op{" "}
              {new Date(doc.signed_at as string).toLocaleString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Print of bewaar deze pagina als kopie.
            </p>
          </div>
        ) : (
          <SignForm token={token} />
        )}
      </div>
    </main>
  );
}
