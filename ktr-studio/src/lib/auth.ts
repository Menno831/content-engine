import { createClient } from "@/lib/supabase/server";

export interface SessionContext {
  user: { id: string; email?: string } | null;
  profile: { role: string; full_name: string | null; client_id: string | null } | null;
  agency: { id: string; name: string; brand_name: string | null; accent: string | null } | null;
}

/**
 * Huidige gebruiker + profiel + agency, voor Server Components.
 * Geeft lege context terug als er geen sessie (of geen Supabase) is.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const empty: SessionContext = { user: null, profile: null, agency: null };
  const supabase = await createClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, client_id, agencies(id, name, brand_name, accent)")
    .eq("user_id", user.id)
    .single();

  // Supabase typeert de join als array; pak het eerste element.
  const agencyRaw = profile?.agencies as unknown;
  const agency = Array.isArray(agencyRaw) ? agencyRaw[0] : agencyRaw;

  return {
    user: { id: user.id, email: user.email },
    profile: profile
      ? { role: profile.role, full_name: profile.full_name, client_id: profile.client_id }
      : null,
    agency: (agency as SessionContext["agency"]) ?? null,
  };
}
