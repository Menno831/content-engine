"use client";

// ════════════════════════════════════════════════════════════════
// Competitor-tracking: volg accounts, zoek door hun beste content en
// spot outliers (≥2x de mediaan van het eigen account). Bewaar
// winnaars met één klik op je swipe-board.
// ════════════════════════════════════════════════════════════════
import { useActionState, useMemo, useState, useTransition } from "react";
import { Card, Badge, icons } from "../_components";
import { fmtNum } from "../_data";
import { saveToBoardAction } from "../boards/actions";
import { addCompetitorAction, deleteCompetitorAction, syncCompetitorAction, type ActionResult } from "./actions";
import type { Competitor, CompetitorPost } from "@/lib/competitors";

const initial: ActionResult = {};

const formatColor: Record<string, string> = {
  Reel: "#F97316",
  Short: "#34D399",
  Carrousel: "#A78BFA",
  Story: "#60A5FA",
};

function SaveButton({ post }: { post: CompetitorPost }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={() =>
        start(async () => {
          const r = await saveToBoardAction(
            { title: post.caption.slice(0, 120) || "(zonder bijschrift)", source: post.handle, url: post.permalink ?? undefined },
            "Outliers"
          );
          if (r.ok || r.error) setSaved(true);
        })
      }
      disabled={pending || saved}
      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-60 px-2.5 py-1.5 text-[12px] transition-all"
    >
      {saved ? "Bewaard ✓" : pending ? "…" : <>{icons.plus} Bewaar</>}
    </button>
  );
}

export function CompetitorBoard({ competitors, posts }: { competitors: Competitor[]; posts: CompetitorPost[] }) {
  const [state, action, pending] = useActionState(addCompetitorAction, initial);
  const [syncing, startSync] = useTransition();
  const [syncMsg, setSyncMsg] = useState<ActionResult>({});
  const [query, setQuery] = useState("");
  const [activeComp, setActiveComp] = useState<string>("");
  const [onlyOutliers, setOnlyOutliers] = useState(false);
  const [platform, setPlatform] = useState<"" | "instagram" | "youtube">("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (platform && p.platform !== platform) return false;
      if (activeComp && p.competitorId !== activeComp) return false;
      if (onlyOutliers && !p.outlier) return false;
      if (q && !p.caption.toLowerCase().includes(q) && !p.handle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, query, activeComp, onlyOutliers, platform]);

  return (
    <>
      {/* Competitor toevoegen */}
      <Card className="p-5 mb-6">
        <form action={action} className="flex flex-col sm:flex-row gap-2">
          <input
            name="handle"
            placeholder="@handle (Instagram) of YouTube-kanaal-URL om te volgen"
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
          <input
            name="niche"
            placeholder="Niche (optioneel)"
            className="sm:w-44 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-5 py-2.5 transition-colors"
          >
            {pending ? "Toevoegen…" : "+ Volgen"}
          </button>
        </form>
        {state.ok && <p className="mt-2 text-[13px] text-emerald-400">{state.ok}</p>}
        {state.error && <p className="mt-2 text-[13px] text-red-400">{state.error}</p>}
        {syncMsg.ok && <p className="mt-2 text-[13px] text-emerald-400">{syncMsg.ok}</p>}
        {syncMsg.error && <p className="mt-2 text-[13px] text-red-400">{syncMsg.error}</p>}

        {competitors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {(["", "instagram", "youtube"] as const).map((pf) => (
              <button
                key={pf || "alles"}
                onClick={() => setPlatform(pf)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
                  platform === pf ? "bg-white/[0.1] text-foreground" : "border border-white/[0.08] text-muted hover:text-accent"
                }`}
              >
                {pf === "" ? "IG + YT" : pf === "instagram" ? "📸 Instagram" : "▶️ YouTube"}
              </button>
            ))}
            <span className="w-px h-5 bg-white/[0.08] mx-1" />
            <button
              onClick={() => setActiveComp("")}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                !activeComp ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-accent"
              }`}
            >
              Alle accounts
            </button>
            {competitors.map((c) => (
              <span key={c.id} className="inline-flex items-center">
                <button
                  onClick={() => setActiveComp(activeComp === c.id ? "" : c.id)}
                  className={`rounded-l-full pl-3 pr-2 py-1.5 text-[12px] transition-all border-y border-l ${
                    activeComp === c.id
                      ? "bg-accent text-background font-bold border-accent"
                      : "border-white/[0.08] text-muted hover:text-accent"
                  }`}
                  title={`${c.followers ? fmtNum(c.followers) + " volgers · " : ""}${c.postCount} posts`}
                >
                  {c.platform === "youtube" ? "▶️ " : "📸 "}
                  {c.handle}
                </button>
                <button
                  onClick={() =>
                    startSync(async () => {
                      setSyncMsg({});
                      const r = await syncCompetitorAction(c.id);
                      setSyncMsg(r);
                    })
                  }
                  disabled={syncing}
                  className="border-y border-white/[0.08] px-1.5 py-1.5 text-[11px] text-muted hover:text-accent disabled:opacity-50"
                  title="Sync posts"
                >
                  ↻
                </button>
                <button
                  onClick={() => {
                    if (confirm(`${c.handle} niet meer volgen?`)) {
                      startSync(async () => {
                        await deleteCompetitorAction(c.id);
                      });
                    }
                  }}
                  className="rounded-r-full border-y border-r border-white/[0.08] px-2 py-1.5 text-[11px] text-muted hover:text-red-400"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Zoeken + outlier-filter */}
      {posts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4">{icons.search}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek in captions en handles…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
            />
          </div>
          <button
            onClick={() => setOnlyOutliers((v) => !v)}
            className={`rounded-xl px-4 py-2.5 text-[13px] transition-all ${
              onlyOutliers ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
            }`}
          >
            🔥 Alleen outliers ({posts.filter((p) => p.outlier).length})
          </button>
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            {competitors.length === 0
              ? "Volg je eerste account hierboven — wij syncen hun posts en markeren automatisch de outliers (posts die ≥2x beter doen dan hun mediaan)."
              : posts.length === 0
                ? "Nog geen posts — klik op ↻ bij een account om te syncen."
                : "Niets gevonden met dit filter."}
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} hover className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Badge color={p.platform === "youtube" ? "#F87171" : "#A78BFA"}>{p.platform === "youtube" ? "YouTube" : "IG"}</Badge>
                  <Badge color={formatColor[p.format] ?? "#888"}>{p.format}</Badge>
                  {p.outlier && <Badge color="#F87171">🔥 {p.multiplier}x outlier</Badge>}
                </div>
                <span className="font-mono text-[11px] text-muted">{fmtNum(p.views)} views</span>
              </div>
              <p className="text-sm leading-snug mb-3 line-clamp-3">{p.caption || "(zonder bijschrift)"}</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  {p.permalink ? (
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
                      {p.handle}
                    </a>
                  ) : (
                    <span>{p.handle}</span>
                  )}
                  <span>♥ {fmtNum(p.likes)}</span>
                </div>
                <SaveButton post={p} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
