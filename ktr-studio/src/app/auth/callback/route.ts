import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// E-mailbevestiging / magic link / OAuth: wissel de code in voor een sessie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/platform";

  if (code) {
    const supabase = await createClient();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
