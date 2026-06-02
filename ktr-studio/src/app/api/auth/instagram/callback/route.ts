import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramAccounts,
} from "@/lib/integrations/instagram-graph";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Callback van Facebook Login. Wisselt code → long-lived token, vindt het
// IG Business Account en slaat de koppeling op in `integrations`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (msg: string) =>
    NextResponse.redirect(`${origin}/platform/clients?ig=${encodeURIComponent(msg)}`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return back("geannuleerd");

  // CSRF + client uit cookies verifiëren.
  const csrfCookie = request.cookies.get("ig_oauth_csrf")?.value;
  const clientCookie = request.cookies.get("ig_oauth_client")?.value;
  const [clientId, csrf] = state.split(".");
  if (!csrfCookie || csrfCookie !== csrf || clientCookie !== clientId) {
    return back("ongeldige_state");
  }

  // Sessie + eigenaarschap van de klant controleren.
  const supabase = await createClient();
  if (!supabase) return back("geen_supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();
  if (!profile || !client) return back("onbekende_klant");

  try {
    const short = await exchangeCodeForToken(code);
    const long = await getLongLivedToken(short.access_token);
    const accounts = await getInstagramAccounts(long.access_token);
    if (accounts.length === 0) return back("geen_ig_account");

    const ig = accounts[0]; // later: keuze tonen bij meerdere accounts
    const expires = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null;

    // Admin-client: integraties-insert heeft (bewust) geen RLS-insert-policy.
    const admin = createAdminClient();
    if (!admin) return back("geen_serverkey");
    await admin.from("integrations").upsert(
      {
        agency_id: profile.agency_id,
        client_id: clientId,
        provider: "instagram_graph",
        status: "connected",
        access_token: long.access_token,
        token_expires: expires,
        external_id: ig.igId,
        last_synced_at: null,
        last_error: null,
      },
      { onConflict: "client_id,provider" }
    );

    const res = back("verbonden");
    res.cookies.delete("ig_oauth_csrf");
    res.cookies.delete("ig_oauth_client");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fout";
    return back(msg);
  }
}
