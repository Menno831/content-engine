"use client";

import { useActionState, useState } from "react";
import { grantTeamLoginAction, type TeamResult } from "./actions";
import { icons } from "../_components";

const initial: TeamResult = {};

export function AddTeamDialog({ editors }: { editors: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("team");
  const [state, action, pending] = useActionState(grantTeamLoginAction, initial);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
      >
        {icons.plus} Teamlid toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-1">Teamlogin aanmaken</h3>
            <p className="text-muted text-sm mb-5">Maak een login met de juiste rol. Het wachtwoord zie je één keer.</p>

            {state.ok && state.password ? (
              <InviteReady
                ok={state.ok}
                email={state.email ?? ""}
                password={state.password}
                role={role}
                onClose={() => setOpen(false)}
              />
            ) : (
              <form action={action} className="space-y-3.5">
                <Field name="name" label="Naam" placeholder="Jesse" required />
                <Field name="email" label="E-mail" type="email" placeholder="jesse@team.nl" required />
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Rol</span>
                  <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
                    <option value="team" className="bg-card">Team (volledige toegang)</option>
                    <option value="editor" className="bg-card">Editor (productieboard)</option>
                    <option value="setter" className="bg-card">Setter (CRM/leads)</option>
                  </select>
                </label>
                {role === "editor" && editors.length > 0 && (
                  <label className="block">
                    <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Koppel aan editor-record</span>
                    <select name="editor_id" defaultValue="" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40">
                      <option value="" className="bg-card">— geen —</option>
                      {editors.map((e) => (
                        <option key={e.id} value={e.id} className="bg-card">{e.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">Annuleren</button>
                  <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">{pending ? "Bezig…" : "Aanmaken"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ name, label, type = "text", placeholder, required }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-mono uppercase tracking-wider text-muted">{label}</span>
      <code className="text-[13px] text-foreground bg-black/30 rounded-lg px-2.5 py-1 border border-white/[0.06] truncate">{value}</code>
    </div>
  );
}

// Succes-scherm met kant-en-klare uitnodiging: login-link + gegevens in
// één bericht, klaar om in WhatsApp/mail te plakken. Editors krijgen 'm
// in het Engels (hun schermen zijn ook Engels).
function InviteReady({
  ok,
  email,
  password,
  role,
  onClose,
}: {
  ok: string;
  email: string;
  password: string;
  role: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

  const invite =
    role === "editor"
      ? `Hi! Here's your login for our production board:\n\n${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nYou'll see all videos ready for editing, with the files linked on each card. Drag a card to "Quality Control" when you're done — we get notified automatically.`
      : `Hoi! Hier is je login voor KTR Studio:\n\n${loginUrl}\nE-mail: ${email}\nWachtwoord: ${password}\n\nLog in en je ziet meteen alles wat voor jou klaarstaat.`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard geblokkeerd — gegevens staan hieronder */
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-emerald-400">{ok}</p>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <Row label="Login-link" value={loginUrl} />
        <Row label="E-mail" value={email} />
        <Row label="Wachtwoord" value={password} />
      </div>
      <button
        onClick={copyInvite}
        className="w-full rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm py-2.5 transition-colors"
      >
        {copied ? "Gekopieerd ✓ — plak in WhatsApp" : "📋 Kopieer uitnodiging (link + login)"}
      </button>
      <p className="text-[11px] text-muted text-center">
        Het wachtwoord is hierna niet meer zichtbaar — kopieer de uitnodiging vóór je sluit.
      </p>
      <button onClick={onClose} className="w-full rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors">
        Klaar
      </button>
    </div>
  );
}
