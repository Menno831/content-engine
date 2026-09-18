"use client";

// ════════════════════════════════════════════════════════════════
// Competitor-tracking: volg accounts, zoek door hun beste content en
// spot outliers (≥2x de mediaan van het eigen account). Bewaar
// winnaars met één klik op je swipe-board.
// ════════════════════════════════════════════════════════════════
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, icons } from "../_components";
import { fmtNum } from "../_data";
import { saveToBoardAction } from "../boards/actions";
import { addCompetitorAction, deleteCompetitorAction, syncCompetitorAction, scoreFitAction, postToIdeaAction, type ActionResult } from "./actions";
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

// Past-bij-mij → met één klik als idee naar Scripts, met de link erbij,
// zodat Menno 'm daar naar zijn eigen verhaal ombouwt.
function IdeaButton({ post }: { post: CompetitorPost }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() =>
        start(async () => {
          const r = await postToIdeaAction(post.id);
          if (r.ideaId) {
            setDone(true);
            router.push("/platform/scripts?tab=ideeen");
          } else if (r.error) alert(r.error);
        })
      }
      disabled={pending || done}
      className="flex items-center gap-1.5 rounded-lg bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent font-bold disabled:opacity-60 px-2.5 py-1.5 text-[12px] transition-colors"
      title="Als idee naar Scripts — daar pas je 'm aan naar jouw verhaal"
    >
      {done ? "Staat bij Ideeën ✓" : pending ? "…" : "→ Idee"}
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
  // Standaard alleen wat bij de strategie past; alles tonen is een bewuste keuze.
  const [onlyFit, setOnlyFit] = useState(true);
  const [scoring, startScore] = useTransition();
  const [scoreMsg, setScoreMsg] = useState<ActionResult>({});

  const unchecked = posts.filter((p) => p.fit === null).length;
  const fitCount = posts.filter((p) => p.fit === true).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (onlyFit && p.fit !== true) return false;
      if (platform && p.platform !== platform) return false;
      if (activeComp && p.competitorId !== activeComp) return false;
      if (onlyOutliers && !p.outlier) return false;
      if (q && !p.caption.toLowerCase().includes(q) && !p.handle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, query, activeComp, onlyOutliers, platform, onlyFit]);

  // Zonder platformfilter: twee secties, YouTube en Instagram apart.
  const sections: { key: "youtube" | "instagram"; label: string; items: CompetitorPost[] }[] = (
    platform ? [platform] : (["youtube", "instagram"] as const)
  )
    .map((pf) => ({
      key: pf,
      label: pf === "youtube" ? "▶️ YouTube" : "📸 Instagram",
      items: filtered.filter((p) => p.platform === pf),
    }))
    .filter((s) => platform || s.items.length > 0);

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
            onClick={() => setOnlyFit((v) => !v)}
            className={`rounded-xl px-4 py-2.5 text-[13px] transition-all ${
              onlyFit ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
            }`}
            title="Alleen posts die bij jouw strategie passen (AI-oordeel)"
          >
            ✓ Past bij mij ({fitCount})
          </button>
          <button
            onClick={() => setOnlyOutliers((v) => !v)}
            className={`rounded-xl px-4 py-2.5 text-[13px] transition-all ${
              onlyOutliers ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
            }`}
          >
            🔥 Outliers ({posts.filter((p) => p.outlier).length})
          </button>
          {unchecked > 0 && (
            <button
              onClick={() =>
                startScore(async () => {
                  setScoreMsg({});
                  setScoreMsg(await scoreFitAction());
                })
              }
              disabled={scoring}
              className="rounded-xl border border-accent/40 text-accent hover:bg-accent/[0.08] disabled:opacity-60 px-4 py-2.5 text-[13px] font-bold transition-all"
              title="De cron doet dit elke ochtend; hiermee doe je het nu"
            >
              {scoring ? "Beoordelen…" : `✦ Check strategie (${unchecked} nieuw)`}
            </button>
          )}
        </div>
      )}
      {scoreMsg.ok && <p className="-mt-3 mb-4 text-[13px] text-emerald-400">{scoreMsg.ok}</p>}
      {scoreMsg.error && <p className="-mt-3 mb-4 text-[13px] text-red-400">{scoreMsg.error}</p>}

      {/* Feed */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted text-sm max-w-md mx-auto">
            {competitors.length === 0
              ? "Volg je eerste account hierboven — wij syncen hun posts en markeren automatisch de outliers (posts die ≥2x beter doen dan hun mediaan)."
              : posts.length === 0
                ? "Nog geen posts — klik op ↻ bij een account om te syncen."
                : onlyFit && fitCount === 0
                  ? unchecked > 0
                    ? "Nog niks beoordeeld — klik op ✦ Check strategie."
                    : "Niets past bij je strategie in deze selectie. Zet 'Past bij mij' uit om alles te zien."
                  : "Niets gevonden met dit filter."}
          </p>
        </Card>
      ) : (
        sections.map((sec) => (
        <section key={sec.key} className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="font-display font-extrabold">{sec.label}</span>
            <span className="font-mono text-[11px] text-muted bg-white/[0.05] rounded-full px-2 py-0.5">{sec.items.length}</span>
          </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sec.items.map((p) => (
            <Card key={p.id} hover className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Badge color={p.platform === "youtube" ? "#F87171" : "#A78BFA"}>{p.platform === "youtube" ? "YouTube" : "IG"}</Badge>
                  <Badge color={formatColor[p.format] ?? "#888"}>{p.format}</Badge>
                  {p.outlier && <Badge color="#F87171">🔥 {p.multiplier}x outlier</Badge>}
                </div>
                <span className="font-mono text-[11px] text-muted">{fmtNum(p.views)} views</span>
              </div>
              <p className="text-sm leading-snug mb-2 line-clamp-3">{p.caption || "(zonder bijschrift)"}</p>
              {/* Waarom dit past, en hoe jij het zou maken */}
              {p.fit === true && (p.fitAngle || p.fitReason) && (
                <p className="text-[12px] text-accent/90 leading-snug mb-3 border-l-2 border-accent/40 pl-2.5">
                  {p.fitAngle ?? p.fitReason}
                </p>
              )}
              {p.fit === false && p.fitReason && (
                <p className="text-[11.5px] text-muted leading-snug mb-3">✗ {p.fitReason}</p>
              )}
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
                <div className="flex items-center gap-1.5">
                  {p.fit === true && <IdeaButton post={p} />}
                  <SaveButton post={p} />
                </div>
              </div>
            </Card>
          ))}
        </div>
        </section>
        ))
      )}
    </>
  );
}
