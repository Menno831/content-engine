import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { createClient as supabaseServer } from "@/lib/supabase/server";

// Editor-logins horen alleen op het productieboard en hun taken.
// Alle agency-pagina's (dashboard, finance, klanten, team...) sturen
// ze terug naar het board — de navigatie verbergt die pagina's al,
// maar een directe URL (of de login-landing) mag er ook niet komen.
export async function redirectEditorToBoard() {
  const ctx = await getSessionContext();
  if (ctx.profile?.role === "editor") redirect("/platform/pipeline");
  return ctx;
}

// Waar iemand na inloggen hoort te landen, per rol.
export function homeForRole(role: string | null | undefined): string {
  if (role === "editor") return "/platform/pipeline";
  if (role === "setter") return "/platform/leads";
  return "/platform";
}

// Voor server actions die alleen het team (owner/team) mag uitvoeren.
// Eén plek voor het supabase/agency/rol-preamble, zodat een vergeten
// check niet meer kan gebeuren.
export async function requireTeam(): Promise<
  | { supabase: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>; agency: { id: string }; userId: string }
  | { error: string }
> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, user, profile } = await getSessionContext();
  if (!agency || !user) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") {
    return { error: "Deze actie is alleen voor het team." };
  }
  return { supabase, agency: { id: agency.id }, userId: user.id };
}
