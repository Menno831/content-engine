import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { JarvisChat } from "./JarvisChat";

// Jarvis: praten of typen, briefings en meedenken op je echte cijfers.
export const maxDuration = 60; // AI-calls mogen even duren

export default async function JarvisPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;

  let initial: { role: "user" | "assistant"; content: string }[] = [];
  let migrationMissing = false;
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) migrationMissing = true;
      else initial = (data ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Home"
        title="Jarvis"
        subtitle="Praat of typ — hij kent je cijfers, brieft je 's ochtends en denkt mee richting je maanddoel"
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — Jarvis werkt in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 030 in Supabase (tabellen <code>briefings</code> en <code>assistant_messages</code>) — daarna
          werkt Jarvis direct.
        </div>
      ) : (
        <JarvisChat initial={initial} />
      )}
    </>
  );
}
