// Lege/niet-verbonden states — getoond i.p.v. cijfers wanneer er geen
// echte data is. Zo zie je nooit een verzonnen getal.
import type { ReactNode } from "react";

export function DemoBanner() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3">
      <span className="grid place-items-center w-6 h-6 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold">
        !
      </span>
      <p className="text-[13px] text-amber-200/90">
        <span className="font-semibold">Demo-data.</span>{" "}
        Nog geen bronnen verbonden — deze cijfers zijn voorbeelden, geen echte data.
        Zet <code className="font-mono text-[12px]">NEXT_PUBLIC_DEMO_MODE=false</code> zodra Supabase + koppelingen live zijn.
      </p>
    </div>
  );
}

export function NotConnected({
  provider,
  children,
}: {
  provider: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
      <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-white/[0.04] text-muted mb-3">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M18.36 18.36A9 9 0 0 1 5.64 5.64m12.72 12.72L5.64 5.64m12.72 12.72L21 21M5.64 5.64 3 3" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="font-display font-bold text-base mb-1">{provider} niet verbonden</h3>
      <p className="text-muted text-sm max-w-sm mx-auto">
        {children ?? "Koppel deze bron om echte data te zien. Tot die tijd tonen we hier bewust niets."}
      </p>
    </div>
  );
}

export function NoData({ label = "Nog geen data" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.01] py-6 text-sm text-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-muted/50" />
      {label}
    </div>
  );
}
