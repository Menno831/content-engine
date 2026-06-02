"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthResult } from "./actions";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";

const initial: AuthResult = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand-kant */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/[0.06] bg-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-accent text-background">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" />
            </svg>
          </span>
          <span className="font-display font-extrabold text-xl">
            KTR <span className="text-muted font-normal">Studio</span>
          </span>
        </div>
        <div className="relative">
          <h1 className="font-display font-extrabold text-4xl leading-tight mb-4">
            Eén platform voor je
            <br />
            hele content-operatie.
          </h1>
          <p className="text-muted max-w-md leading-relaxed">
            Pipeline, leads, omzet en rapportage per klant — in jouw huisstijl. Geen losse tools meer.
          </p>
        </div>
        <div className="relative font-mono text-[11px] uppercase tracking-wider text-muted">
          © {new Date().getFullYear()} KTR Studio
        </div>
      </div>

      {/* Formulier-kant */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-background font-display font-extrabold">
              K
            </span>
            <span className="font-display font-extrabold text-lg">KTR Studio</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl mb-1">
            {mode === "in" ? "Inloggen" : "Account aanmaken"}
          </h2>
          <p className="text-muted text-sm mb-7">
            {mode === "in" ? "Welkom terug." : "Start je eigen agency-workspace."}
          </p>

          {(DEMO_MODE || !isSupabaseConfigured) && (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-[12px] text-amber-200/90">
              Supabase nog niet gekoppeld — inloggen werkt zodra de keys in{" "}
              <code className="font-mono">.env.local</code> staan.
            </div>
          )}

          <form action={formAction} className="space-y-3.5">
            {mode === "up" && (
              <>
                <Field name="name" label="Je naam" type="text" placeholder="Menno Kater" />
                <Field name="agency" label="Naam agency" type="text" placeholder="KTR Studio" />
              </>
            )}
            <Field name="email" label="E-mail" type="email" placeholder="jij@agency.nl" required />
            <Field name="password" label="Wachtwoord" type="password" placeholder="••••••••" required />

            {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
            {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-3 transition-colors"
            >
              {pending ? "Bezig…" : mode === "in" ? "Inloggen" : "Account aanmaken"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted text-center">
            {mode === "in" ? "Nog geen account?" : "Al een account?"}{" "}
            <button
              onClick={() => setMode(mode === "in" ? "up" : "in")}
              className="text-accent hover:text-accent-hover font-medium"
            >
              {mode === "in" ? "Registreer" : "Inloggen"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors"
      />
    </label>
  );
}
