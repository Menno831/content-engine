import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthUrl, graphConfigured } from "@/lib/integrations/instagram-graph";
import { createClient } from "@/lib/supabase/server";

// Start de Instagram Graph-koppeling voor één klant.
// Aanroepen als: /api/auth/instagram?client_id=<uuid>
export async function GET(request: NextRequest) {
  if (!graphConfigured()) {
    return NextResponse.json(
      { error: "Meta Graph niet geconfigureerd (META_APP_ID/SECRET)." },
      { status: 503 }
    );
  }

  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is verplicht" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase niet geconfigureerd." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // Controleer dat deze klant van de agency van de gebruiker is (RLS dekt dit).
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single();
  if (!client) {
    return NextResponse.json({ error: "Onbekende klant." }, { status: 404 });
  }

  const csrf = randomBytes(16).toString("hex");
  const state = `${clientId}.${csrf}`;
  const secure = process.env.NODE_ENV === "production";

  const res = NextResponse.redirect(getAuthUrl(state));
  const cookieOpts = { httpOnly: true, secure, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("ig_oauth_csrf", csrf, cookieOpts);
  res.cookies.set("ig_oauth_client", clientId, cookieOpts);
  return res;
}
