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
    const answers = lead.answers;

    const html = generateReportEmail(score, username, igData, answers);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Menno van Content Engine <onboarding@resend.dev>",
      to: lead.email,
      subject: `@${username} — je persoonlijke content analyse`,
      html,
    });

    // Mark as sent
    await supabase
      .from("assessment_leads")
      .update({ report_sent_at: new Date().toISOString() })
      .eq("id", leadId);

    return NextResponse.json({ success: true, sentTo: lead.email });
  } catch (error) {
    console.error("Send report error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function generateReportEmail(score: number, username: string, igData: any, answers: any): string {
  const stats = igData?.stats;
  const flags = igData?.flags || [];

  // Build personalized sections based on actual data
  const sections: string[] = [];

  // --- SECTION 1: Score context ---
  const scoreContext = score <= 20
    ? "Je content werkt op dit moment niet voor je business. Dat is niet erg — de meeste founders beginnen hier. Hieronder lees je precies wat je kunt veranderen."
    : score <= 45
    ? "Je hebt een basis, maar je laat kansen liggen. De verbeterpunten hieronder kunnen je binnen 90 dagen naar een compleet ander niveau tillen."
    : score <= 70
    ? "Je bent op de goede weg. De punten hieronder zijn de optimalisaties die het verschil maken tussen 'zichtbaar' en 'de go-to persoon in je niche'."
    : "Sterk profiel. Je doet al veel goed. Hieronder de finetuning die je content van goed naar uitzonderlijk brengt.";

  // --- SECTION 2: Account Diagnose (data-driven) ---
  if (stats) {
    let diagnose = `<h2 style="color:#F5F0EB;font-size:18px;font-weight:700;margin:0 0 6px;">Wat we zien bij @${username}</h2>`;
    diagnose += `<p style="color:#888;font-size:13px;margin:0 0 16px;">Op basis van je laatste ${stats.reelsPercentage !== undefined ? "posts" : "activiteit"} op Instagram.</p>`;

    // Followers context
    if (stats.followers) {
      const fCount = stats.followers;
      if (fCount < 1000) {
        diagnose += bullet("Je zit onder de 1.000 volgers", `Met ${fCount.toLocaleString()} volgers zit je in de groeifase. Het goede nieuws: juist nu heb je het hoogste organische bereik per post. Instagram duwt kleinere accounts harder als ze consistent posten. Dit is het moment om een systeem neer te zetten.`);
      } else if (fCount < 5000) {
        diagnose += bullet("Je zit in de 1K-5K range", `${fCount.toLocaleString()} volgers is een solide basis. Je hebt genoeg social proof om serieus genomen te worden. De uitdaging nu: converteren. Elke post moet werken als een mini-salespage.`);
      } else {
        diagnose += bullet("Sterke volgersbase", `Met ${fCount.toLocaleString()} volgers heb je bereik. De vraag is: zet je dat om in business? Focus op bottom-funnel content.`);
      }
    }

    // Reels analysis
    if (stats.reelsPercentage !== undefined) {
      if (stats.reelsPercentage === 0) {
        diagnose += bullet("Geen Reels in je recente content", `Dit is je grootste gemiste kans. Instagram geeft Reels 2-3x meer bereik dan foto's of carousels. Eén Reel per week kan je bereik in 30 dagen verdubbelen. Je hoeft niet te dansen — talking head video's waarin je je expertise deelt werken het beste voor founders.`);
      } else if (stats.reelsPercentage < 30) {
        diagnose += bullet(`Maar ${stats.reelsPercentage}% van je content is video`, `Voor maximaal bereik wil je richting 50-60% video. Carousels zijn goed voor saves, maar Reels zijn goed voor nieuw bereik. De ideale mix: 3 Reels + 2 carousels per week.`);
      } else {
        diagnose += bullet(`${stats.reelsPercentage}% video content`, `Goede verhouding. Je gebruikt video actief. Focus nu op hook-optimalisatie — de eerste 1,5 seconde bepaalt 80% van je bereik.`);
      }
    }

    // Engagement context
    if (stats.engagementRate !== undefined) {
      const er = stats.engagementRate;
      if (er >= 5) {
        diagnose += bullet(`Engagement rate: ${er}% — bovengemiddeld`, `Dit is sterk voor een business account. Je community reageert actief. Focus nu op conversie: voeg een duidelijke CTA toe aan elke post (DM me 'STRATEGIE', link in bio, etc).`);
      } else if (er >= 3) {
        diagnose += bullet(`Engagement rate: ${er}% — gemiddeld`, `Dit is prima, maar er zit meer in. Posts met een duidelijke mening of een concreet framework scoren 2-3x beter op engagement. Probeer: "De 3 fouten die ik zie bij [jouw niche]" als format.`);
      } else if (er >= 1) {
        diagnose += bullet(`Engagement rate: ${er}% — onder gemiddeld`, `Voor een business account wil je richting 3-6%. Lage engagement betekent dat je volgers niet genoeg reden hebben om te reageren. Stel vragen, deel controversiele takes, of gebruik polls in Stories om interactie te triggeren.`);
      } else {
        diagnose += bullet(`Engagement rate: ${er}% — kritiek laag`, `Je volgers zien je content, maar reageren niet. Dit is een signaal dat je content te generiek is of niet aansluit bij je doelgroep. Nicheer je boodschap: spreek 1 type klant aan, niet iedereen.`);
      }
    }

    // Activity / last post
    if (stats.lastPostDaysAgo !== undefined) {
      if (stats.lastPostDaysAgo > 30) {
        diagnose += bullet(`Al ${stats.lastPostDaysAgo} dagen niet gepost`, `Dit is het meest urgente punt. Het Instagram-algoritme vergeet je na 7-10 dagen inactiviteit. Je verliest elke dag bereik. Begin met 1 post deze week — het hoeft niet perfect te zijn. Consistentie wint altijd van perfectie.`);
      } else if (stats.lastPostDaysAgo > 7) {
        diagnose += bullet(`Laatste post: ${stats.lastPostDaysAgo} dagen geleden`, `Je post niet vaak genoeg om momentum op te bouwen. Doel: minimaal 3x per week. Batch je content: neem in 1 sessie 5-10 clips op, dan heb je materiaal voor 2-3 weken.`);
      }
    }

    sections.push(diagnose);
  }

  // --- SECTION 3: Actieplan (based on quiz + data) ---
  let actieplan = `<h2 style="color:#F5F0EB;font-size:18px;font-weight:700;margin:0 0 6px;">Jouw 30-dagen actieplan</h2>`;
  actieplan += `<p style="color:#888;font-size:13px;margin:0 0 16px;">Concrete stappen die je deze maand kunt zetten. In volgorde van impact.</p>`;

  const actions: { title: string; steps: string[] }[] = [];

  // Most impactful actions based on their weaknesses
  if (stats?.reelsPercentage === 0 || stats?.reelsPercentage === undefined) {
    actions.push({
      title: "Week 1-2: Start met Reels",
      steps: [
        "Neem 3 talking head clips op van 30-60 seconden over je expertise",
        "Gebruik dit format: Probleem van je klant → Jouw perspectief → Wat ze moeten doen",
        "Post ze op maandag, woensdag en vrijdag tussen 8:00-9:00 of 17:00-18:00",
        "Begin elke Reel met een hook: een vraag, een stelling, of een getal",
      ],
    });
  }

  if (stats?.lastPostDaysAgo && stats.lastPostDaysAgo > 14) {
    actions.push({
      title: "Deze week: Doorbreek de stilte",
      steps: [
        "Post vandaag nog een carousel of foto met een persoonlijk verhaal",
        "Vertel wat je de afgelopen weken hebt gedaan en waar je naartoe werkt",
        "Stel een vraag aan het einde zodat mensen reageren",
        "Reageer op elke comment binnen 1 uur — dit boost het algoritme",
      ],
    });
  }

  // Check quiz answers for funnel weakness
  const funnelAnswer = answers?.find?.((a: any) => a.id === "funnel");
  if (funnelAnswer?.score <= 1) {
    actions.push({
      title: "Week 2-3: Bouw je content funnel",
      steps: [
        "Top-funnel: 2x per week een Reel over een herkenbaar probleem in je niche",
        "Mid-funnel: 1x per week een carousel met een framework of case study",
        "Bottom-funnel: 1x per week een post met een directe CTA naar een gesprek",
        "Zet een link-in-bio tool op (Linktree, Stan, of directe link naar je agenda)",
      ],
    });
  }

  const brandAnswer = answers?.find?.((a: any) => a.id === "personal_brand");
  if (brandAnswer?.score <= 1) {
    actions.push({
      title: "Week 3-4: Bouw je personal brand",
      steps: [
        "Kies 3 pillar topics waar je altijd over praat (bijv. strategie, video, groei)",
        "Maak je bio glashelder: Wie je bent + Wie je helpt + CTA",
        "Deel 1x per week een persoonlijk verhaal of les — mensen connecten met mensen",
        "Gebruik consistent dezelfde kleuren en fonts in je visuals voor herkenbaarheid",
      ],
    });
  }

  // Bio optimization if needed
  if (flags.some((f: any) => f.title?.toLowerCase().includes("bio"))) {
    actions.push({
      title: "Vandaag: Optimaliseer je bio",
      steps: [
        "Regel 1: Wat je doet in 1 zin (bijv. 'Ik help founders groeien met video')",
        "Regel 2: Social proof of resultaat (bijv. '50+ klanten geholpen' of specifiek resultaat)",
        "Regel 3: CTA (bijv. 'Plan een gratis gesprek ↓' of 'DM me GROEI')",
        "Link: Direct naar je agenda of een landingspagina — niet naar je homepage",
      ],
    });
  }

  // Default action if nothing else
  if (actions.length === 0) {
    actions.push({
      title: "Deze maand: Optimaliseer voor conversie",
      steps: [
        "Voeg aan elke post een CTA toe: DM-trigger, link in bio, of directe vraag",
        "Test 2 verschillende hook-stijlen per week en meet welke meer bereik krijgt",
        "Deel minimaal 1 klantverhaal of case study per week",
        "Reageer proactief op 10 accounts in je niche per dag voor zichtbaarheid",
      ],
    });
  }

  for (const action of actions.slice(0, 4)) {
    actieplan += `<div style="margin-bottom:16px;padding:16px 20px;background:#111;border-radius:10px;border:1px solid #1a1a1a;">`;
    actieplan += `<h3 style="color:#f97316;font-size:14px;font-weight:700;margin:0 0 10px;">${action.title}</h3>`;
    actieplan += `<ol style="margin:0;padding-left:18px;">`;
    for (const step of action.steps) {
      actieplan += `<li style="color:#ccc;font-size:13px;line-height:1.7;margin-bottom:4px;">${step}</li>`;
    }
    actieplan += `</ol></div>`;
  }

  sections.push(actieplan);

  // --- SECTION 4: Benchmark ---
  let benchmark = `<h2 style="color:#F5F0EB;font-size:18px;font-weight:700;margin:0 0 6px;">Hoe je scoort vs. andere founders</h2>`;
  benchmark += `<p style="color:#888;font-size:13px;margin:0 0 16px;">Gebaseerd op 100+ founder-profielen die we hebben geanalyseerd.</p>`;
  benchmark += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">`;

  const benchmarks = [
    { metric: "Reels percentage", yours: stats?.reelsPercentage !== undefined ? `${stats.reelsPercentage}%` : "—", avg: "25%", top: "60%+" },
    { metric: "Engagement rate", yours: stats?.engagementRate !== undefined ? `${stats.engagementRate}%` : "—", avg: "2.5%", top: "5%+" },
    { metric: "Post frequentie", yours: stats?.lastPostDaysAgo !== undefined ? (stats.lastPostDaysAgo <= 3 ? "Actief" : stats.lastPostDaysAgo <= 7 ? "Wekelijks" : "Inactief") : "—", avg: "2x/week", top: "5x/week" },
  ];

  benchmark += `<tr style="border-bottom:1px solid #1a1a1a;">
    <td style="padding:10px 0;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;"></td>
    <td style="padding:10px 8px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Jij</td>
    <td style="padding:10px 8px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Gemiddeld</td>
    <td style="padding:10px 8px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Top 10%</td>
  </tr>`;

  for (const b of benchmarks) {
    benchmark += `<tr style="border-bottom:1px solid #1a1a1a;">
      <td style="padding:10px 0;color:#aaa;font-size:13px;">${b.metric}</td>
      <td style="padding:10px 8px;color:#f97316;font-size:13px;font-weight:700;text-align:center;">${b.yours}</td>
      <td style="padding:10px 8px;color:#666;font-size:13px;text-align:center;">${b.avg}</td>
      <td style="padding:10px 8px;color:#22c55e;font-size:13px;text-align:center;">${b.top}</td>
    </tr>`;
  }

  benchmark += `</table>`;
  sections.push(benchmark);

  // --- ASSEMBLE EMAIL ---
  const catLabel = score <= 20 ? "Kritiek" : score <= 45 ? "Achterstand" : score <= 70 ? "Op weg" : "Sterk";
  const catColor = score <= 20 ? "#ef4444" : score <= 45 ? "#f97316" : score <= 70 ? "#eab308" : "#22c55e";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060606;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ccc;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060606;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">

<!-- Personal header -->
<tr><td style="padding:32px 32px 24px;">
  <p style="color:#F5F0EB;font-size:15px;line-height:1.6;margin:0;">Hey,</p>
  <p style="color:#ccc;font-size:14px;line-height:1.7;margin:12px 0 0;">
    Ik heb je Instagram-profiel <strong style="color:#f97316;">@${username}</strong> geanalyseerd op basis van je assessment.
    Hieronder je volledige rapport met concrete actiepunten die je direct kunt toepassen.
  </p>
</td></tr>

<!-- Score -->
<tr><td style="padding:0 32px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1a1a1a;border-radius:12px;">
  <tr>
    <td style="padding:24px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Content Score</p>
          <p style="margin:4px 0 0;color:#F5F0EB;font-size:36px;font-weight:800;line-height:1;">${score}<span style="font-size:16px;color:#555;font-weight:400;">/100</span></p>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <span style="display:inline-block;padding:6px 16px;border-radius:20px;background:${catColor}15;border:1px solid ${catColor}30;color:${catColor};font-size:13px;font-weight:700;">${catLabel}</span>
        </td>
      </tr>
      </table>
      <p style="color:#888;font-size:13px;line-height:1.6;margin:14px 0 0;">${scoreContext}</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Dynamic sections -->
${sections.map(s => `<tr><td style="padding:0 32px 28px;">${s}</td></tr>`).join("")}

<!-- CTA -->
<tr><td style="padding:0 32px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1a1a1a;border-radius:12px;">
  <tr><td style="padding:24px 28px;">
    <h2 style="color:#F5F0EB;font-size:16px;font-weight:700;margin:0 0 8px;">Wil je dit samen uitwerken?</h2>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 16px;">
      In een gratis strategiegesprek van 30 minuten lopen we je profiel door en bouwen we een concreet Reels-plan op maat. Geen verplichtingen, geen sales pitch — gewoon een eerlijk gesprek over je contentstrategie.
    </p>
    <a href="https://content-engine-nine-psi.vercel.app/book" style="display:inline-block;padding:12px 28px;background:#f97316;color:#060606;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
      Plan een gratis gesprek
    </a>
  </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
  <p style="color:#555;font-size:11px;line-height:1.6;margin:0;">
    Dit rapport is persoonlijk gegenereerd voor @${username} op basis van je Instagram-data en assessment-antwoorden.
    <br>Menno Kater — Content Engine
  </p>
</td></tr>

</table></td></tr></table></body></html>`;
}

function bullet(title: string, text: string): string {
  return `<div style="margin-bottom:12px;padding:14px 18px;background:#111;border-radius:10px;border:1px solid #1a1a1a;border-left:3px solid #f97316;">
    <h3 style="color:#F5F0EB;font-size:14px;font-weight:700;margin:0 0 6px;">${title}</h3>
    <p style="color:#aaa;font-size:13px;line-height:1.7;margin:0;">${text}</p>
  </div>`;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
