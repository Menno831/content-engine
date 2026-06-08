"use client";

import { useMemo, useState } from "react";
import { Card, icons } from "../_components";

type Template = "carrousel" | "quote" | "hooks";

const SAMPLE = `Iedereen post elke dag — en niemand groeit.

De waarheid: je hook is niet het probleem. Je eerste frame wel.

De eerste 3 seconden bepalen 90% van je bereik.

Wil je mijn frame-formule? Reageer met 'FRAME'.`;

export function BrandStudio({ brandName }: { brandName: string }) {
  const [template, setTemplate] = useState<Template>("carrousel");
  const [text, setText] = useState(SAMPLE);

  const slides = useMemo(() => {
    const chunks = text
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return chunks.length ? chunks : ["Plak je tekst links…"];
  }, [text]);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Input */}
      <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24 no-print">
        <h2 className="font-display font-extrabold text-xl mb-4">Tekst → merk</h2>

        <div className="flex gap-2 mb-4">
          {(["carrousel", "quote", "hooks"] as Template[]).map((t) => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`rounded-lg px-3 py-1.5 text-[13px] capitalize transition-all ${template === t ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Plak je tekst</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-none"
          placeholder="Plak een script, offer of testimonial. Lege regels splitsen in slides."
        />

        <button
          onClick={() => window.print()}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-3 transition-colors"
        >
          {icons.reports} Exporteer als PDF
        </button>
        <p className="mt-2 text-[11px] text-muted text-center">Print-dialoog → &ldquo;Opslaan als PDF&rdquo;. AI-herschrijven naar merkstem volgt.</p>
      </Card>

      {/* Preview */}
      <div className="lg:col-span-3 print-area">
        {template === "quote" ? (
          <BrandFrame brandName={brandName}>
            <p className="font-display font-extrabold text-2xl leading-snug">&ldquo;{slides[0]}&rdquo;</p>
          </BrandFrame>
        ) : (
          <div className={template === "hooks" ? "space-y-3" : "grid sm:grid-cols-2 gap-4"}>
            {slides.map((s, i) =>
              template === "hooks" ? (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-card p-4 flex items-start gap-3 print-card">
                  <span className="font-display font-extrabold text-accent">{i + 1}</span>
                  <p className="text-sm leading-snug">{s}</p>
                </div>
              ) : (
                <BrandFrame key={i} brandName={brandName} index={i + 1} total={slides.length}>
                  <p className="font-display font-extrabold text-lg leading-snug">{s}</p>
                </BrandFrame>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BrandFrame({
  children,
  brandName,
  index,
  total,
}: {
  children: React.ReactNode;
  brandName: string;
  index?: number;
  total?: number;
}) {
  return (
    <div className="aspect-[4/5] rounded-2xl bg-card border border-white/[0.08] p-6 flex flex-col justify-between relative overflow-hidden print-card">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full" style={{ background: "var(--accent)", opacity: 0.12 }} />
      {index && (
        <div className="flex items-center justify-between relative">
          <span className="font-mono text-[11px] text-accent">{String(index).padStart(2, "0")}{total ? `/${String(total).padStart(2, "0")}` : ""}</span>
          <span className="w-8 h-1 rounded-full bg-accent" />
        </div>
      )}
      <div className="relative">{children}</div>
      <div className="flex items-center gap-2 relative">
        <span className="w-5 h-5 rounded grid place-items-center text-background text-[11px] font-bold" style={{ background: "var(--accent)" }}>
          {brandName[0]}
        </span>
        <span className="font-display font-bold text-[13px]">{brandName}</span>
      </div>
    </div>
  );
}
