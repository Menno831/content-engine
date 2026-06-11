"use client";

import { useActionState, useState } from "react";
import { runIntakeAction, createIntakeLinkAction, type ActionResult } from "./actions";
import { Card, icons } from "../_components";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";

const initial: ActionResult = {};

/**
 * Brand voice intake: vaste vragen die jij (tijdens onboarding) of de
 * klant zelf (via deelbare link) beantwoordt. AI zet de antwoorden om
 * in identity / story / strategy / voice.
 */
export function IntakeWizard({
  clientId,
  answers,
}: {
  clientId: string;
  answers: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(runIntakeAction, initial);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const hasAnswers = Object.values(answers).some(Boolean);

  async function copyLink() {
    setLinkMsg(null);
    const res = await createIntakeLinkAction(clientId);
    if (res.error) return setLinkMsg(res.error);
    const url = `${window.location.origin}${res.url}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkMsg("Link gekopieerd — stuur 'm naar de klant.");
    } catch {
      setLinkMsg(url);
    }
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display font-extrabold text-xl">Brand voice intake</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-1.5 text-[12px] transition-all"
          >
            {icons.send} Intake-link voor klant
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg bg-accent hover:bg-accent-hover text-background font-bold px-3 py-1.5 text-[12px] transition-colors"
          >
            {open ? "Inklappen" : hasAnswers ? "Antwoorden bewerken" : "Intake starten"}
          </button>
        </div>
      </div>
      <p className="text-muted text-sm">
        10 vragen → AI schrijft de brand identity, story, strategy en <strong>voice</strong>.
        Vul ze samen in tijdens de onboarding-call, of stuur de klant de link.
      </p>
      {linkMsg && <p className="mt-2 text-[13px] text-accent break-all">{linkMsg}</p>}
      {state.ok && <p className="mt-2 text-[13px] text-emerald-400">{state.ok}</p>}
      {state.error && <p className="mt-2 text-[13px] text-red-400">{state.error}</p>}

      {open && (
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="client_id" value={clientId} />
          {INTAKE_QUESTIONS.map((q, i) => (
            <div key={q.key}>
              <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">
                {i + 1}. {q.label}
              </label>
              <textarea
                name={`q_${q.key}`}
                defaultValue={answers[q.key] ?? ""}
                rows={2}
                placeholder={q.hint}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y leading-relaxed"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-5 py-2.5 transition-colors"
          >
            {pending ? (
              <>
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Branddocumenten genereren…
              </>
            ) : (
              <>{icons.spark} Verwerk intake → genereer branddocs</>
            )}
          </button>
          <p className="text-[11px] text-muted">
            De gegenereerde documenten verschijnen hieronder bij Brand-context — lees ze altijd na en stel bij.
          </p>
        </form>
      )}
    </Card>
  );
}
