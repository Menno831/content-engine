import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";

/**
 * Vernieuwt de sessie en beschermt /platform. In demo-modus (showroom) of
 * zolang Supabase niet geconfigureerd is, laten we alles door — dan is het
 * dashboard publiek bekijkbaar met demo-data, zonder login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (DEMO_MODE || !isSupabaseConfigured) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const onAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  if (!user && path.startsWith("/platform")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && onAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/platform";
    return NextResponse.redirect(url);
  }
  return response;
}
