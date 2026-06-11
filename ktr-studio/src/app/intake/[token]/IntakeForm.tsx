"use client";

import { useActionState } from "react";
import { submitIntakeAction, type IntakeResult } from "./actions";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";

const initial: IntakeResult = {};

export function IntakeForm({ token, answers }: { token: string; answers: Record<string, string> }) {
  const [state, action, pending] = useActionState(submitIntakeAction, initial);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-8 text-center">
        <div className="text-3xl mb-3">✓</div>
        <h2 className="font-display font-extrabold text-xl mb-2">Dank je wel!</h2>
        <p className="text-muted text-sm leading-relaxed">
          Je antwoorden zijn binnen. We verwerken ze in jouw brand voice en nemen het resultaat
          met je door in de volgende call.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      {INTAKE_QUESTIONS.map((q, i) => (
        <div key={q.key}>
          <label className="block font-medium text-[15px] mb-1">
            <span className="text-accent font-mono text-[13px] mr-2">{String(i + 1).padStart(2, "0")}</span>
            {q.label}
          </label>
          <p className="text-muted text-[13px] mb-2">{q.hint}</p>
          <textarea
            name={`q_${q.key}`}
            defaultValue={answers[q.key] ?? ""}
            rows={3}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-accent/40 resize-y leading-relaxed"
          />
        </div>
      ))}

      {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold px-5 py-3.5 transition-colors"
      >
        {pending ? (
          <>
            <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            Versturen…
          </>
        ) : (
          "Antwoorden versturen"
        )}
      </button>
    </form>
  );
}
