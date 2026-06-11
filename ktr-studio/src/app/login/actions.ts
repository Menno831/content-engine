"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  error?: string;
  ok?: string;
}

// Maak Supabase-foutmeldingen begrijpelijk in het Nederlands.
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail of wachtwoord klopt niet.";
  if (m.includes("email not confirmed"))
    return "Je e-mail is nog niet bevestigd. Maak opnieuw een account aan — dat bevestigt nu automatisch.";
  if (m.includes("password")) return "Wachtwoord moet minimaal 6 tekens zijn.";
  return msg;
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is nog niet geconfigureerd (.env.local)." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vul e-mail en wachtwoord in." };

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendly(error.message) };
  } catch {
    return { error: "Kon niet inloggen — probeer het opnieuw." };
  }

  revalidatePath("/", "layout");
  redirect("/platform");
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is nog niet geconfigureerd (.env.local)." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const agencyName = String(formData.get("agency") ?? "").trim() || "Mijn agency";
  const fullName = String(formData.get("name") ?? "").trim();
  if (!email || !password) return { error: "Vul e-mail en wachtwoord in." };

  const admin = createAdminClient();

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      // Bestaat al? Probeer dan gewoon in te loggen met dit wachtwoord.
      if (/registered|already exists/i.test(error.message)) {
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) {
          return {
            error: "Dit e-mailadres heeft al een account. Klopt het wachtwoord niet? Probeer in te loggen.",
          };
        }
        // ingelogd op bestaand account → door naar redirect
      } else {
        return { error: friendly(error.message) };
      }
    } else {
      const userId = data.user?.id;
      if (userId && admin) {
        // Auto-bevestig de e-mail (zodat er GEEN bevestigingsmail nodig is).
        await admin.auth.admin.updateUserById(userId, { email_confirm: true });

        // Bootstrap: agency + owner-profiel (service-role, want RLS blokkeert dit anders).
        const { data: agency, error: agencyErr } = await admin
          .from("agencies")
          .insert({ name: agencyName, owner_id: userId, brand_name: agencyName })
          .select("id")
          .single();
        if (agencyErr || !agency) {
          // Agency-aanmaak mislukt -> ruim de losse auth-user op, geen orphan.
          await admin.auth.admin.deleteUser(userId).catch(() => {});
          return { error: "Account aanmaken mislukt — probeer het opnieuw." };
        }
        await admin.from("profiles").insert({
          user_id: userId,
          agency_id: agency.id,
          role: "owner",
          full_name: fullName,
        });
      }

      // Geen sessie uit signUp (bevestiging stond aan)? Log nu direct in.
      if (!data.session) {
        const { error: e3 } = await supabase.auth.signInWithPassword({ email, password });
        if (e3) {
          return { error: "Account aangemaakt, maar automatisch inloggen lukte niet. Probeer in te loggen." };
        }
      }
    }
  } catch {
    return { error: "Er ging iets mis bij het aanmaken — probeer het opnieuw." };
  }

  revalidatePath("/", "layout");
  redirect("/platform");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
