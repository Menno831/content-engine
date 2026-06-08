"use client";

import { useState, useTransition } from "react";
import { Card, Badge, icons } from "../_components";
import { saveToBoardAction } from "../boards/actions";
import { fmtNum, type DiscoverItem } from "../_data";

const CATEGORIES = ["Alles", "Productiviteit", "Zelfontwikkeling", "Business", "Health", "Content"];

const formatColor: Record<string, string> = {
  Reel: "#F97316",
  Short: "#34D399",
  Carrousel: "#A78BFA",
};

function SaveButton({ item }: { item: DiscoverItem }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={() =>
        start(async () => {
          const r = await saveToBoardAction({ title: item.title, source: item.creator }, "Swipe file");
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

export function DiscoverGrid({ items }: { items: DiscoverItem[] }) {
  const [cat, setCat] = useState("Alles");
  const filtered = cat === "Alles" ? items : items.filter((i) => i.category === cat);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-all ${cat === c ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((i) => (
          <Card key={i.id} hover className="p-0 overflow-hidden">
            <div className="aspect-video grid place-items-center relative" style={{ background: `linear-gradient(135deg, ${formatColor[i.format]}22, #0c0c0c)` }}>
              <span className="grid place-items-center w-12 h-12 rounded-full bg-black/30 text-foreground/70">{icons.eye}</span>
              <span className="absolute top-2 left-2"><Badge color={formatColor[i.format]}>{i.format}</Badge></span>
              <span className="absolute bottom-2 right-2 text-[11px] font-mono bg-black/40 rounded px-1.5 py-0.5 text-white/80">{fmtNum(i.views)} views</span>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-sm leading-snug mb-1">{i.title}</h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[12px] text-muted">{i.creator}</span>
                <SaveButton item={i} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
