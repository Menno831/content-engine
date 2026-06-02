"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Browser-side Supabase client. Geeft `null` terug als Supabase nog niet
 * geconfigureerd is, zodat de UI dat netjes als "niet verbonden" toont
 * i.p.v. te crashen.
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
