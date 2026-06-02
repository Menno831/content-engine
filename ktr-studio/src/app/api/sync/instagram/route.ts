import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncClientInstagram } from "@/lib/sync/instagram";

// Trigger een Instagram-sync voor één klant. POST { client_id }.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase niet geconfigureerd." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth vereist" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clientId = body.client_id;
  if (!clientId) return NextResponse.json({ error: "client_id verplicht" }, { status: 400 });

  // Eigenaarschap via RLS: alleen klanten van de eigen agency zijn zichtbaar.
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "onbekende klant" }, { status: 404 });

  const result = await syncClientInstagram(clientId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
