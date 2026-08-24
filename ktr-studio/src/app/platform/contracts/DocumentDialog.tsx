"use client";

// Nieuw ondertekenbaar document: kies sjabloon (NDA of klant-
// overeenkomst), vul de velden, pas de tekst desgewenst aan en
// maak aan — je krijgt direct de ondertekenlink.

import { useState, useTransition } from "react";
import { buildEditorNda, buildClientAgreement } from "@/lib/legal";
import { createDocumentAction } from "./actions";

export function DocumentDialog({
  clients,
  onCreated,
}: {
  clients: { id: string; label: string }[];
  onCreated: (row: { title: string; party: string | null; clientId: string | null; value: number; recurring: boolean; token: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [tpl, setTpl] = useState<"nda" | "klant">("nda");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [bedrijf, setBedrijf] = useState("");
  const [pakket, setPakket] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function toPreview() {
    if (!naam.trim()) {
      setError(tpl === "nda" ? "Vul de naam van de editor in." : "Vul de naam van de klant in.");
      return;
    }
    setError("");
    const doc =
      tpl === "nda"
        ? buildEditorNda({ editorNaam: naam.trim(), editorEmail: email.trim() || undefined })
        : buildClientAgreement({
            klantNaam: naam.trim(),
            bedrijf: bedrijf.trim() || undefined,
            pakket: pakket.trim() || "nader af te spreken pakket",
            maandbedrag: Number(bedrag) || 0,
          });
    setTitle(doc.title);
    setBody(doc.body);
    setStep(2);
  }

  function create() {
    start(async () => {
      const r = await createDocumentAction({
        title,
        body,
        clientId: clientId || null,
        party: naam.trim(),
        value: tpl === "klant" ? Number(bedrag) || 0 : 0,
        recurring: tpl === "klant",
      });
      if (r.error) setError(r.error);
      else if (r.token) {
        setError("");
        const url = `${window.location.origin}/sign/${r.token}`;
        setLink(url);
        onCreated({
          title,
          party: naam.trim(),
          clientId: clientId || null,
          value: tpl === "klant" ? Number(bedrag) || 0 : 0,
          recurring: tpl === "klant",
          token: r.token,
        });
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* kopiëren mag falen */
        }
      }
    });
  }

  function reset() {
    setOpen(false);
    setStep(1);
    setNaam("");
    setEmail("");
    setBedrijf("");
    setPakket("");
    setBedrag("");
    setClientId("");
    setLink("");
    setError("");
  }

  const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-accent/25 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-sm px-4 py-2.5 transition-colors shrink-0"
      >
        📄 NDA / overeenkomst
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={reset}>
          <div
            className="w-full max-w-2xl bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {link ? (
              <>
                <h3 className="font-display font-extrabold text-xl mb-2">Document staat klaar ✓</h3>
                <p className="text-[13px] text-muted mb-4">
                  De ondertekenlink is gekopieerd — stuur &apos;m via WhatsApp of mail. Zodra er getekend is, springt het
                  contract automatisch op &ldquo;getekend&rdquo;.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 mb-4">
                  <code className="text-[12px] text-muted truncate flex-1">{link}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    className="text-[12px] text-accent hover:text-accent-hover shrink-0"
                  >
                    Kopieer
                  </button>
                </div>
                <button onClick={reset} className="w-full rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm py-2.5 transition-colors">
                  Klaar
                </button>
              </>
            ) : step === 1 ? (
              <>
                <h3 className="font-display font-extrabold text-xl mb-1">Nieuw document</h3>
                <p className="text-[12.5px] text-muted mb-4">
                  Praktische standaardtekst, vóór het versturen nog volledig aan te passen. Geen vervanging van
                  juridisch advies.
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTpl("nda")}
                    className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                      tpl === "nda" ? "border-accent/50 bg-accent/[0.08]" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-sm">NDA voor editor</div>
                    <div className="text-[12px] text-muted">Geheimhouding, rechten, geen klantbenadering</div>
                  </button>
                  <button
                    onClick={() => setTpl("klant")}
                    className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                      tpl === "klant" ? "border-accent/50 bg-accent/[0.08]" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-sm">Klant-overeenkomst</div>
                    <div className="text-[12px] text-muted">Pakket, betaling, revisies, opzegging</div>
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={label}>{tpl === "nda" ? "Naam editor" : "Naam contactpersoon"}</span>
                      <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={tpl === "nda" ? "Max ..." : "Nico ..."} className={field} />
                    </label>
                    {tpl === "nda" ? (
                      <label className="block">
                        <span className={label}>E-mail (optioneel)</span>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                      </label>
                    ) : (
                      <label className="block">
                        <span className={label}>Bedrijfsnaam (optioneel)</span>
                        <input value={bedrijf} onChange={(e) => setBedrijf(e.target.value)} className={field} />
                      </label>
                    )}
                  </div>

                  {tpl === "klant" && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={label}>Pakket</span>
                        <input value={pakket} onChange={(e) => setPakket(e.target.value)} placeholder="8 video's per maand" className={field} />
                      </label>
                      <label className="block">
                        <span className={label}>Maandbedrag €</span>
                        <input value={bedrag} onChange={(e) => setBedrag(e.target.value)} type="number" className={field} />
                      </label>
                    </div>
                  )}

                  <label className="block">
                    <span className={label}>Koppel aan klant (optioneel)</span>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
                      <option value="" className="bg-card">— geen —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id} className="bg-card">{c.label}</option>
                      ))}
                    </select>
                  </label>

                  {error && <p className="text-[13px] text-red-400">{error}</p>}

                  <div className="flex gap-2 pt-1">
                    <button onClick={reset} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                      Annuleren
                    </button>
                    <button onClick={toPreview} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm py-2.5 transition-colors">
                      Naar voorbeeld →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display font-extrabold text-xl mb-3">Controleer en pas aan</h3>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={field + " mb-3 font-bold"} />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className={field + " resize-y font-[inherit] text-[13px] leading-relaxed"}
                />
                {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
                <div className="flex gap-2 pt-3">
                  <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
                    ← Terug
                  </button>
                  <button
                    onClick={create}
                    disabled={pending}
                    className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm py-2.5 transition-colors"
                  >
                    {pending ? "…" : "Aanmaken + link kopiëren"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
