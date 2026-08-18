"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";

export interface TeamResult {
  error?: string;
  ok?: string;
  email?: string;
  password?: string;
}

const ROLES = ["team", "editor", "setter"] as const;

export async function grantTeamLoginAction(_prev: TeamResult, formData: FormData): Promise<TeamResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };
  if (profile && profile.role !== "owner" && profile.role !== "team") {
    return { error: "Alleen owner/team kan logins aanmaken." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "team");
  const editorId = String(formData.get("editor_id") ?? "") || null;
  if (!name) return { error: "Naam is verplicht." };
  if (!email) return { error: "E-mail is verplicht." };
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: "Ongeldige rol." };

  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };

  const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) + "9!";
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created?.user) {
    return { error: /registered|exists/i.test(error?.message ?? "") ? "Dit e-mailadres heeft al een account." : (error?.message ?? "Aanmaken mislukt.") };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: created.user.id,
    agency_id: agency.id,
    role,
    full_name: name,
    editor_id: role === "editor" ? editorId : null,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileErr.message };
  }

  revalidatePath("/platform/team");
  return { ok: `Login voor ${name} (${role}) aangemaakt.`, email, password };
}

// ── Teamlid bekijken, bewerken en wachtwoord resetten ───────────
// E-mail en wachtwoord leven in Supabase Auth; alles loopt via de
// admin-key en is afgeschermd tot owner/team van dezelfde agency.

async function requireTeam() {
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." as const };
  if (profile && profile.role !== "owner" && profile.role !== "team") {
    return { error: "Alleen owner/team mag dit." as const };
  }
  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." as const };
  return { agency, admin };
}

export interface MemberDetail {
  user_id: string;
  name: string;
  role: string;
  email: string;
  editor_id: string | null;
}

export async function getTeamMemberAction(userId: string): Promise<{ error?: string; data?: MemberDetail }> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const { data: profile } = await ctx.admin
    .from("profiles")
    .select("user_id, full_name, role, editor_id, agency_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile || profile.agency_id !== ctx.agency.id) return { error: "Teamlid niet gevonden." };

  const { data: userRes } = await ctx.admin.auth.admin.getUserById(userId);
  return {
    data: {
      user_id: userId,
      name: profile.full_name ?? "—",
      role: profile.role ?? "team",
      email: userRes?.user?.email ?? "",
      editor_id: profile.editor_id ?? null,
    },
  };
}

export async function updateTeamMemberAction(
  userId: string,
  patch: { name?: string; role?: string; editor_id?: string | null }
): Promise<TeamResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.full_name = patch.name.trim() || "—";
  if (patch.role !== undefined) {
    if (!ROLES.includes(patch.role as (typeof ROLES)[number]) && patch.role !== "owner") return { error: "Ongeldige rol." };
    update.role = patch.role;
  }
  if (patch.editor_id !== undefined) update.editor_id = patch.editor_id || null;

  const { error } = await ctx.admin
    .from("profiles")
    .update(update)
    .eq("user_id", userId)
    .eq("agency_id", ctx.agency.id);
  if (error) return { error: error.message };

  revalidatePath("/platform/team");
  return { ok: "Opgeslagen." };
}

// Nieuw wachtwoord genereren (het oude is niet terug te halen) en
// tonen, zodat je het direct kunt doorsturen met de login-link.
export async function resetTeamPasswordAction(userId: string): Promise<TeamResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const { data: profile } = await ctx.admin
    .from("profiles")
    .select("agency_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile || profile.agency_id !== ctx.agency.id) return { error: "Teamlid niet gevonden." };

  const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) + "9!";
  const { data: updated, error } = await ctx.admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  return { ok: "Nieuw wachtwoord gezet.", email: updated?.user?.email ?? undefined, password };
}
