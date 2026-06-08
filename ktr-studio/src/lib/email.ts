// Best-effort e-mail via Resend (zonder SDK, puur fetch).
// Geen RESEND_API_KEY of geen ontvanger -> stilletjes overslaan.

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "KTR Studio <onboarding@resend.dev>";

export const emailConfigured = () => Boolean(RESEND_KEY);

export async function sendEmail(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!RESEND_KEY || !opts.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
