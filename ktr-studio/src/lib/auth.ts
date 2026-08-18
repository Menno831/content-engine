import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SessionContext {
  user: { id: string; email?: string } | null;
  profile: { role: string; full_name: string | null; client_id: string | null; editor_id: string | null } | null;
  agency: { id: string; name: string; brand_name: string | null; accent: string | null; monthly_target: number | null } | null;
  clientName: string | null; // gevuld als de gebruiker een client-login is
}

/**
 * Huidige gebruiker + profiel + agency, voor Server Components.
 * Geeft lege context terug als er geen sessie (of geen Supabase) is.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const empty: SessionContext = { user: null, profile: null, agency: null, clientName: null };
  const supabase = await createClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  let { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, client_id, editor_id, agencies(id, name, brand_name, accent, monthly_target)")
    .eq("user_id", user.id)
    .maybeSingle();

  // Self-heal: ingelogde gebruiker zonder profiel (bijv. database opnieuw
  // opgezet terwijl het auth-account bleef bestaan) -> maak agency + owner-
  // profiel automatisch aan, zodat het account weer gewoon werkt.
  if (!profile) {
    const admin = createAdminClient();
    if (admin) {
      const fallbackName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Mijn agency";
      const { data: agencyRow } = await admin
        .from("agencies")
        .insert({ name: fallbackName, owner_id: user.id, brand_name: fallbackName })
        .select("id")
        .single();
      if (agencyRow) {
        await admin.from("profiles").insert({
          user_id: user.id,
          agency_id: agencyRow.id,
          role: "owner",
          full_name: fallbackName,
        });
        const { data: healed } = await supabase
          .from("profiles")
          .select("role, full_name, client_id, editor_id, agencies(id, name, brand_name, accent, monthly_target)")
          .eq("user_id", user.id)
          .maybeSingle();
        profile = healed;
      }
    }
  }

  // Supabase typeert de join als array; pak het eerste element.
  const agencyRaw = profile?.agencies as unknown;
  const agency = Array.isArray(agencyRaw) ? agencyRaw[0] : agencyRaw;

  // Naam van de gekoppelde klant ophalen (voor client-logins).
  let clientName: string | null = null;
  if (profile?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", profile.client_id)
      .single();
    clientName = client?.name ?? null;
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile
      ? { role: profile.role, full_name: profile.full_name, client_id: profile.client_id, editor_id: profile.editor_id ?? null }
      : null,
    agency: (agency as SessionContext["agency"]) ?? null,
    clientName,
  };
}
