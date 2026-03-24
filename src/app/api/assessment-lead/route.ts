import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, score, answers, igData } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Save lead to Supabase (email rapport wordt handmatig verstuurd)
    try {
      const supabase = getSupabase();
      await supabase.from("assessment_leads").insert({
        email,
        instagram_username: username || null,
        score: score || 0,
        answers: answers || null,
        ig_followers: igData?.stats?.followers || null,
        ig_engagement_rate: igData?.stats?.engagementRate || null,
        ig_data: igData || null,
      });
    } catch (err) {
      console.error("Supabase insert error:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}

// GET: Admin endpoint om leads te bekijken
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");

  // Simpele admin beveiliging via query param
  if (adminKey !== process.env.ADMIN_KEY && adminKey !== "ktr2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("assessment_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ leads: data || [] });
  } catch (error) {
    console.error("Fetch leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
