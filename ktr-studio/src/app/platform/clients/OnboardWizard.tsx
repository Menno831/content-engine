"use client";

// ════════════════════════════════════════════════════════════════
// Onboarding-wizard: één vloeiende flow om een klant aan te maken.
// Stap 1 Basis → 2 Kanalen → 3 Kleuren → 4 Brand voice (intake).
// Eén <form> over alle stappen (velden blijven in de DOM, alleen
// verborgen) → één submit naar onboardClientAction → door naar profiel.
// ════════════════════════════════════════════════════════════════
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onboardClientAction, type ActionResult } from "./actions";
import { Card, icons } from "../_components";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
import { SpeechTextarea } from "@/app/_shared/SpeechTextarea";

const initial: ActionResult & { clientId?: string } = {};

const STEPS = ["Basis", "Kanalen", "Kleuren", "Brand voice"] as const;

export function OnboardWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#F97316");
  const [secondary, setSecondary] = useState("#0C0C0C");
  const [state, action, pending] = useActionState(onboardClientAction, initial);

  // Na succes: door naar het klantprofiel (intake/transcripten/opdrachten).
  useEffect(() => {
    if (state.ok && state.clientId) {
      const t = setTimeout(() => router.push(`/platform/clients/${state.clientId}`), 600);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const canNext = step > 0 || name.trim().length > 0;

  return (
    <Card className="p-6 md:p-8 max-w-2xl">
      {/* Stappen-indicator */}
      <div className="flex items-center gap-2 mb-7">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`grid place-items-center w-7 h-7 rounded-full text-[12px] font-bold shrink-0 transition-all ${
                  i < step ? "bg-accent text-background" : i === step ? "bg-accent/20 text-accent border border-accent/40" : "bg-white/[0.04] text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`text-[12.5px] hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-accent/50" : "bg-white/[0.07]"}`} />}
          </div>
        ))}
      </div>

      <form action={action}>
        {/* STAP 1 — Basis */}
        <div className={step === 0 ? "block" : "hidden"}>
          <h2 className="font-display font-extrabold text-xl mb-1">Wie is de klant?</h2>
          <p className="text-muted text-sm mb-5">De basis. De rest kun je later altijd aanvullen op het profiel.</p>
          <Field label="Naam *" name="name" value={name} onChange={setName} placeholder="Lars Vermeer" required />
          <Field label="Contact-e-mail (voor meldingen)" name="contact_email" type="email" placeholder="lars@bedrijf.nl" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pakket" name="package" placeholder="Growth" />
            <Field label="Retainer / maand (€)" name="monthly_value" type="number" placeholder="2500" />
          </div>
        </div>

        {/* STAP 2 — Kanalen */}
        <div className={step === 1 ? "block" : "hidden"}>
          <h2 className="font-display font-extrabold text-xl mb-1">Kanalen koppelen</h2>
          <p className="text-muted text-sm mb-5">Vul de handles in om straks content en cijfers te kunnen syncen.</p>
          <Field label="Instagram-handle" name="ig_handle" placeholder="@larsbuilds" />
          <Field label="YouTube (kanaal-id of @handle)" name="yt_channel_id" placeholder="@larsbuilds of UC…" />
          <p className="text-[12px] text-muted">Geen handle? Geen probleem — sla over en koppel later.</p>
        </div>

        {/* STAP 3 — Kleuren */}
        <div className={step === 2 ? "block" : "hidden"}>
          <h2 className="font-display font-extrabold text-xl mb-1">Brand-kleuren</h2>
          <p className="text-muted text-sm mb-5">Sturen straks de carousels, stories en thumbnails aan — niet meer standaard oranje.</p>
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <label className="flex items-center gap-2.5 text-sm text-muted">
              <input type="color" name="brand_primary" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-white/[0.1] bg-transparent cursor-pointer" />
              Hoofdkleur
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted">
              <input type="color" name="brand_secondary" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-white/[0.1] bg-transparent cursor-pointer" />
              Secundair
            </label>
          </div>
          {/* Mini-preview */}
          <div className="rounded-xl overflow-hidden border border-white/[0.08] h-24 flex items-end p-4" style={{ background: `linear-gradient(135deg, ${secondary}, #060606)` }}>
            <span className="h-2 w-16 rounded-full" style={{ background: primary }} />
          </div>
        </div>

        {/* STAP 4 — Brand voice intake */}
        <div className={step === 3 ? "block" : "hidden"}>
          <h2 className="font-display font-extrabold text-xl mb-1">Brand voice intake</h2>
          <p className="text-muted text-sm mb-2">
            Optioneel maar krachtig. Beantwoord wat je kunt — klik het microfoontje en <strong>spreek je antwoord gewoon in</strong>. De AI maakt er direct de brand voice van.
          </p>
          <p className="text-[12px] text-muted mb-5">Geen tijd nu? Sla over — je kunt later een deelbare intake-link naar de klant sturen vanaf het profiel.</p>
          <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
            {INTAKE_QUESTIONS.map((q, i) => (
              <div key={q.key}>
                <label className="block text-[12.5px] mb-1.5">
                  <span className="text-accent font-mono text-[12px] mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                  {q.label}
                </label>
                <SpeechTextarea
                  name={`q_${q.key}`}
                  rows={2}
                  placeholder={q.hint}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>

        {state.error && <p className="mt-4 text-[13px] text-red-400">{state.error}</p>}
        {state.ok && <p className="mt-4 text-[13px] text-emerald-400">{state.ok} Doorsturen naar profiel…</p>}

        {/* Navigatie */}
        <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-xl border border-white/[0.08] hover:border-white/20 disabled:opacity-40 px-4 py-2.5 text-sm transition-colors"
          >
            Vorige
          </button>

          {step < STEPS.length - 1 ? (
            <div className="flex items-center gap-2">
              {step >= 1 && (
                <button type="submit" disabled={pending} className="rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-4 py-2.5 text-sm transition-all">
                  Overslaan & aanmaken
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canNext}
                className="flex items-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold px-5 py-2.5 text-sm transition-colors"
              >
                Volgende {icons.arrowRight}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold px-6 py-2.5 text-sm transition-colors"
            >
              {pending ? (
                <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Aanmaken…</>
              ) : (
                <>{icons.check} Klant aanmaken</>
              )}
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors"
      />
    </label>
  );
}
