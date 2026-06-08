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
