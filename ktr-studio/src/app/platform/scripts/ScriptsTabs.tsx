"use client";

// Twee tabbladen op één pagina: je scripts en de ideeën waar ze uit
// komen. Een idee omzetten springt naar Scripts met dat script open.

import { useRouter, useSearchParams } from "next/navigation";
import { ScriptsBoard, type ScriptRow } from "./ScriptsBoard";
import { IdeasBoard } from "./IdeasBoard";
import type { ContentIdea, IdeaSource } from "@/lib/ideas-shared";

export function ScriptsTabs({
  scripts,
  clients,
  ideas,
  sources,
  ideasMissing,
}: {
  scripts: ScriptRow[];
  clients: { id: string; name: string }[];
  ideas: ContentIdea[];
  sources: IdeaSource[];
  ideasMissing: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") === "ideeen" ? "ideeen" : "scripts";
  const focus = params.get("script");

  function go(next: "scripts" | "ideeen", scriptId?: string) {
    const p = new URLSearchParams();
    if (next === "ideeen") p.set("tab", "ideeen");
    if (scriptId) p.set("script", scriptId);
    router.push(`/platform/scripts${p.size ? `?${p}` : ""}`);
  }

  const newIdeas = ideas.filter((i) => i.status === "nieuw").length;

  return (
    <>
      <div className="flex gap-1.5 mb-5">
        <Tab active={tab === "scripts"} onClick={() => go("scripts")} label={`Scripts (${scripts.length})`} />
        <Tab
          active={tab === "ideeen"}
          onClick={() => go("ideeen")}
          label={newIdeas > 0 ? `Ideeën (${newIdeas} nieuw)` : "Ideeën"}
        />
      </div>

      {tab === "ideeen" ? (
        ideasMissing ? (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
            Draai migratie 041 in Supabase (tabellen <code>content_ideas</code> en <code>idea_sources</code>).
          </div>
        ) : (
          <IdeasBoard ideas={ideas} sources={sources} onOpenScript={(id) => go("scripts", id)} />
        )
      ) : (
        <ScriptsBoard key={focus ?? "none"} initial={scripts} clients={clients} initialActiveId={focus} />
      )}
    </>
  );
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
        active ? "bg-accent text-background" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}
