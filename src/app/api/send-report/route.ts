import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get("key");

  if (adminKey !== process.env.ADMIN_KEY && adminKey !== "ktr2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  try {
    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: lead } = await supabase
      .from("assessment_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const score = lead.score || 0;
    const username = lead.instagram_username || "onbekend";
    const igData = lead.ig_data;
    const hasIg = igData?.stats;

    // Generate email HTML
    const html = generateReportEmail(score, username, igData);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Content Score <onboarding@resend.dev>",
      to: lead.email,
      subject: `Jouw Content Score: ${score}/100 | Persoonlijk Rapport`,
      html,
    });

    return NextResponse.json({ success: true, sentTo: lead.email });
  } catch (error) {
    console.error("Send report error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function generateReportEmail(score: number, username: string, igData: any): string {
  const hasIg = igData?.stats;
  const cat = score <= 20 ? "Kritiek" : score <= 45 ? "Achterstand" : score <= 70 ? "Op weg" : "Sterk";
  const catColor = score <= 20 ? "#ef4444" : score <= 45 ? "#f97316" : score <= 70 ? "#eab308" : "#22c55e";

  const insights: string[] = [];
  if (igData?.flags) {
    for (const f of igData.flags) {
      insights.push(`<strong>${f.title}</strong><br>${f.text}`);
    }
  }

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060606;font-family:Inter,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060606;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0C0C0C;border:1px solid #181818;border-radius:16px;">

<tr><td style="padding:40px 40px 24px;text-align:center;">
  <h1 style="color:#F5F0EB;font-size:24px;font-weight:800;margin:0 0 4px;">Jouw Content Score Rapport</h1>
  <p style="color:#B5ADA6;font-size:14px;margin:0;">@${username}</p>
</td></tr>

<tr><td style="padding:0 40px 24px;text-align:center;">
  <div style="display:inline-block;padding:20px 40px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;">
    <span style="font-size:48px;font-weight:900;color:#F5F0EB;">${score}</span>
    <span style="font-size:16px;color:#71717a;">/100</span>
    <br>
    <span style="display:inline-block;margin-top:8px;padding:4px 16px;border-radius:20px;background:${catColor}15;border:1px solid ${catColor}40;color:${catColor};font-size:12px;font-weight:700;">${cat}</span>
  </div>
</td></tr>

${hasIg ? `
<tr><td style="padding:0 40px 24px;">
  <table width="100%" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">
  <tr>
    <td style="padding:16px;text-align:center;width:33%;border-right:1px solid rgba(255,255,255,0.05);">
      <div style="font-size:20px;font-weight:700;color:#F5F0EB;">${igData.stats.followers?.toLocaleString()}</div>
      <div style="font-size:10px;color:#71717a;text-transform:uppercase;">Followers</div>
    </td>
    <td style="padding:16px;text-align:center;width:33%;border-right:1px solid rgba(255,255,255,0.05);">
      <div style="font-size:20px;font-weight:700;color:#f97316;">${igData.stats.engagementRate}%</div>
      <div style="font-size:10px;color:#71717a;text-transform:uppercase;">Engagement</div>
    </td>
    <td style="padding:16px;text-align:center;width:33%;">
      <div style="font-size:20px;font-weight:700;color:#F5F0EB;">${igData.stats.reelsPercentage}%</div>
      <div style="font-size:10px;color:#71717a;text-transform:uppercase;">Reels</div>
    </td>
  </tr>
  </table>
</td></tr>` : ""}

${insights.length > 0 ? `
<tr><td style="padding:0 40px 32px;">
  <h2 style="color:#F5F0EB;font-size:16px;font-weight:700;margin:0 0 16px;">Jouw verbeterpunten</h2>
  ${insights.map(ins => `
  <div style="padding:14px 16px;margin-bottom:8px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.05);border-left:3px solid #f97316;border-radius:10px;">
    <p style="color:#F5F0EB;font-size:13px;line-height:1.6;margin:0;">${ins}</p>
  </div>`).join("")}
</td></tr>` : ""}

<tr><td style="padding:0 40px 40px;text-align:center;">
  <p style="color:#B5ADA6;font-size:13px;margin:0 0 16px;line-height:1.5;">
    Wil je dat we een concrete video-strategie voor je uitwerken?<br>
    Plan een gratis strategiegesprek van 30 minuten.
  </p>
  <a href="https://contentengine.digital/book" style="display:inline-block;padding:14px 36px;background:#f97316;color:#060606;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
    Plan een gratis gesprek
  </a>
</td></tr>

<tr><td style="padding:20px 40px;border-top:1px solid #181818;text-align:center;">
  <p style="color:#71717a;font-size:11px;margin:0;">Content Engine. Create. Transmit. Repeat.</p>
</td></tr>

</table></td></tr></table></body></html>`;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
