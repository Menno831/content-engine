"use client";

import { useState, useTransition } from "react";
import { Card, Avatar, Badge } from "../_components";
import {
  getTeamMemberAction,
  updateTeamMemberAction,
  resetTeamPasswordAction,
  type MemberDetail,
} from "./actions";

const LOGIN_URL = "https://content-engine-kr5c.vercel.app/login";

interface Option {
  id: string;
  label: string;
}

const ROLE_OPTIONS = [
  { id: "team", label: "Team" },
  { id: "editor", label: "Editor" },
  { id: "setter", label: "Setter" },
];

// Kaart + detaildialoog per teamlid: e-mail zien, naam/rol aanpassen,
// nieuw wachtwoord genereren en het login-bericht in één klik kopiëren.
export function TeamMemberCard({
  member,
  roleLabel,
  roleColor,
  editors,
}: {
  member: { id: string; name: string; role: string };
  roleLabel: string;
  roleColor: string;
  editors: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setOpen(true);
    setError("");
    setMsg("");
    setPassword("");
    setCopied(false);
    startTransition(async () => {
      const r = await getTeamMemberAction(member.id);
      if (r.error) setError(r.error);
      else setDetail(r.data ?? null);
    });
  }

  function save() {
    if (!detail) return;
    startTransition(async () => {
      const r = await updateTeamMemberAction(detail.user_id, {
        name: detail.name,
        role: detail.role,
        editor_id: detail.role === "editor" ? detail.editor_id : null,
      });
      setError(r.error ?? "");
      setMsg(r.ok ?? "");
    });
  }

  function resetPassword() {
    if (!detail) return;
    if (!confirm(`Nieuw wachtwoord voor ${detail.name}? Het oude werkt daarna niet meer.`)) return;
    startTransition(async () => {
      const r = await resetTeamPasswordAction(detail.user_id);
      if (r.error) setError(r.error);
      else {
        setPassword(r.password ?? "");
        setMsg("Nieuw wachtwoord gezet — kopieer het login-bericht en stuur het door.");
      }
    });
  }

  async function copyLogin() {
    if (!detail) return;
    const text = `Inloggen op KTR Studio:\n${LOGIN_URL}\n\nE-mail: ${detail.email}${password ? `\nWachtwoord: ${password}` : ""}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button onClick={openDialog} className="text-left w-full">
        <Card hover className="p-5 flex items-center gap-3 cursor-pointer">
          <Avatar initials={member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()} size={42} />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{member.name}</div>
            <div className="text-[12px] text-muted truncate">Klik voor login & instellingen</div>
          </div>
          <Badge color={roleColor}>{roleLabel}</Badge>
        </Card>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card border border-white/[0.08] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-extrabold text-xl mb-4">{member.name}</h3>

            {!detail && !error && <p className="text-sm text-muted">Laden…</p>}
            {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}

            {detail && (
              <div className="space-y-3.5">
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">E-mail (login)</span>
                  <div className="flex gap-2">
                    <input value={detail.email} readOnly className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-muted outline-none" />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Naam</span>
                  <input
                    value={detail.name}
                    onChange={(e) => setDetail({ ...detail, name: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Rol</span>
                    <select
                      value={detail.role}
                      disabled={detail.role === "owner"}
                      onChange={(e) => setDetail({ ...detail, role: e.target.value })}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 disabled:opacity-60"
                    >
                      {detail.role === "owner" && <option value="owner" className="bg-card">Owner</option>}
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.id} value={r.id} className="bg-card">{r.label}</option>
                      ))}
                    </select>
                  </label>
                  {detail.role === "editor" && (
                    <label className="block">
                      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Editor-profiel</span>
                      <select
                        value={detail.editor_id ?? ""}
                        onChange={(e) => setDetail({ ...detail, editor_id: e.target.value || null })}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
                      >
                        <option value="" className="bg-card">— geen —</option>
                        {editors.map((o) => (
                          <option key={o.id} value={o.id} className="bg-card">{o.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {password && (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3">
                    <div className="text-[12px] font-mono uppercase tracking-wider text-muted mb-1">Nieuw wachtwoord</div>
                    <code className="text-[15px] text-emerald-300">{password}</code>
                    <p className="text-[11.5px] text-muted mt-1.5">Dit zie je maar één keer — kopieer het login-bericht hieronder.</p>
                  </div>
                )}

                {msg && !error && <p className="text-[13px] text-emerald-400">{msg}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors">
                    {pending ? "…" : "Opslaan"}
                  </button>
                  <button onClick={resetPassword} disabled={pending} className="flex-1 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent py-2.5 text-sm transition-all">
                    Nieuw wachtwoord
                  </button>
                  <button onClick={copyLogin} disabled={!detail.email} className="flex-1 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent py-2.5 text-sm transition-all">
                    {copied ? "Gekopieerd ✓" : "Kopieer login-bericht"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
