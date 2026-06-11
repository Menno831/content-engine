"use client";

// Second brain verkenner: zoek door alles wat je ooit bewaarde
// (titels + inhoud), filter op type, gegroepeerd per board.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, icons } from "../_components";
import type { Capture } from "../_data";

const kindMeta: Record<string, { label: string; color: string }> = {
  link: { label: "Link", color: "#60A5FA" },
  youtube: { label: "YouTube", color: "#F87171" },
  note: { label: "Notitie", color: "#FBBF24" },
  idea: { label: "Idee", color: "#A78BFA" },
  swipe: { label: "Swipe", color: "#34D399" },
};

export function BoardsExplorer({ captures }: { captures: Capture[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");

  // Bewaard item -> Boost: tekst meegeven via sessionStorage, dan navigeren.
  function boost(c: Capture) {
    try {
      sessionStorage.setItem("boost:core", c.body || c.title);
    } catch {
      /* private mode — geen probleem, gebruiker plakt zelf */
    }
    router.push("/platform/boost");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return captures.filter((c) => {
      if (kind && c.kind !== kind) return false;
      if (q && !`${c.title} ${c.body ?? ""} ${c.source ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [captures, query, kind]);

  const boards = [...new Set(filtered.map((c) => c.board))];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4">{icons.search}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek door je hele second brain…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setKind("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-all ${!kind ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-accent"}`}
          >
            Alles
          </button>
          {Object.entries(kindMeta).map(([k, m]) => (
            <button
              key={k}
              onClick={() => setKind(kind === k ? "" : k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-all ${kind === k ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-accent"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm">Niets gevonden — pas je zoekopdracht aan.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {boards.map((board) => {
            const items = filtered.filter((c) => c.board === board);
            return (
              <div key={board}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid place-items-center w-6 h-6 rounded-md bg-white/[0.05] text-muted">{icons.dashboard}</span>
                  <h2 className="font-display font-bold">{board}</h2>
                  <span className="font-mono text-[11px] text-muted">{items.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map((c) => {
                    const k = kindMeta[c.kind] ?? kindMeta.link;
                    return (
                      <Card key={c.id} hover className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge color={k.color}>{k.label}</Badge>
                          {c.source && <span className="text-[11px] text-muted">{c.source}</span>}
                        </div>
                        <h3 className="font-medium text-sm leading-snug mb-1.5">{c.title}</h3>
                        {c.body && <p className="text-[12px] text-muted leading-relaxed line-clamp-3">{c.body}</p>}
                        <div className="mt-2.5 flex items-center gap-3">
                          <button onClick={() => boost(c)} className="inline-flex items-center gap-1 text-[12px] text-accent hover:text-accent-hover font-medium">
                            {icons.rocket} Boost
                          </button>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground">
                              Open ↗
                            </a>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
