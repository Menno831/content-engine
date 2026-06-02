import { NextRequest, NextResponse } from "next/server";
import { fetchInstagram, instagramConfigured } from "@/lib/integrations/instagram";

// Simpele in-memory rate limiting per IP.
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const handle = new URL(request.url).searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is verplicht" }, { status: 400 });
  }

  // Bron niet gekoppeld → expliciet "niet verbonden", géén nepdata.
  if (!instagramConfigured()) {
    return NextResponse.json(
      { connected: false, reason: "Instagram-bron niet geconfigureerd (RAPIDAPI_KEY)." },
      { status: 503 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Te veel verzoeken, probeer later." }, { status: 429 });
  }

  try {
    const result = await fetchInstagram(handle);
    return NextResponse.json(
      { connected: true, ...result },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg === "not_configured") {
      return NextResponse.json({ connected: false }, { status: 503 });
    }
    return NextResponse.json(
      { connected: true, error: "Profiel niet gevonden of niet publiek." },
      { status: 404 }
    );
  }
}
