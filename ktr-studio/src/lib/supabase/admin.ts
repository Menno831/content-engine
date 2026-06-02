import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client (server-only) — omzeilt RLS. Uitsluitend gebruiken
 * voor bootstrap-acties zoals het aanmaken van een agency bij signup.
 * NOOIT naar de client sturen.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
