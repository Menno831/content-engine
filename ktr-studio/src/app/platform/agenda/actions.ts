"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/guard";
import { importCalendar, type CalendarSyncResult } from "@/lib/sync/calendar";

export async function saveCalendarUrlAction(url: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };
  const clean = url.trim().replace(/^webcal:\/\//i, "https://");
  if (clean && !/^https:\/\/.+\.ics(\?.*)?$/i.test(clean) && !/calendar\.google\.com\/calendar\/ical\//i.test(clean)) {
    return { error: "Dit lijkt niet op een iCal-adres. Het eindigt normaal op basic.ics." };
  }
  const { error } = await ctx.supabase.from("agencies").update({ calendar_ics_url: clean || null }).eq("id", ctx.agency.id);
  if (error) return { error: error.message };
  revalidatePath("/platform/agenda");
  return { ok: true };
}

export async function importCalendarAction(): Promise<CalendarSyncResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const r = await importCalendar(ctx.supabase, ctx.agency.id);
  revalidatePath("/platform/agenda");
  revalidatePath("/platform");
  return r;
}
