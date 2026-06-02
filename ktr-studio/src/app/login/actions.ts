"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  error?: string;
  ok?: string;
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is nog niet geconfigureerd (.env.local)." };

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/platform");
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is nog niet geconfigureerd (.env.local)." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const agencyName = String(formData.get("agency") ?? "").trim() || "Mijn agency";
  const fullName = String(formData.get("name") ?? "").trim();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // Bootstrap: maak agency + owner-profiel aan met de service-role client
  // (RLS zou dit anders blokkeren omdat er nog geen profiel bestaat).
  const userId = data.user?.id;
  if (userId) {
    const admin = createAdminClient();
    if (admin) {
      const { data: agency } = await admin
        .from("agencies")
        .insert({ name: agencyName, owner_id: userId, brand_name: agencyName })
        .select("id")
        .single();
      if (agency) {
        await admin.from("profiles").insert({
          user_id: userId,
          agency_id: agency.id,
          role: "owner",
          full_name: fullName,
        });
      }
    }
  }

  if (!data.session) {
    return { ok: "Account aangemaakt — bevestig je e-mail en log daarna in." };
  }
  revalidatePath("/", "layout");
  redirect("/platform");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
