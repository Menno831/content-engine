// Gedeelde UI-bouwstenen voor de platform-mockup.
// Inline SVG-iconen + kleine presentational components — geen externe deps.
import type { ReactNode } from "react";

// ── Iconen ─────────────────────────────────────────────────────────
const I = ({ d, fill = false }: { d: string; fill?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill={fill ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

export const icons = {
  dashboard: <I d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6ZM13 9h8V3h-8v6Z" />,
  pipeline: <I d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v4H4v-4Zm10 0h6v4h-6v-4Z" />,
  studio: <I d="M12 3v2m0 14v2M5 12H3m18 0h-2M7 7l-1.5-1.5M18.5 18.5 17 17M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
  leads: <I d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />,
  analytics: <I d="M3 3v18h18M7 14l3-3 3 3 5-6" />,
  reports: <I d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M9 13h6M9 17h6" />,
  clients: <I d="M3 9.5 12 4l9 5.5M5 11v8h14v-8M9 19v-5h6v5" />,
  search: <I d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3" />,
  bell: <I d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  plus: <I d="M12 5v14M5 12h14" />,
  spark: <I d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" />,
  arrowUp: <I d="M12 19V5M5 12l7-7 7 7" />,
  arrowRight: <I d="M5 12h14M13 6l6 6-6 6" />,
  check: <I d="M20 6 9 17l-5-5" />,
  dot: <I d="M12 12h.01" />,
  eye: <I d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  money: <I d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  send: <I d="m22 2-7 20-4-9-9-4 20-7Z" />,
};

// ── Section label (oranje, mono, accent-lijn) ──────────────────────
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <span className="h-px w-6 bg-accent/60" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        {children}
      </span>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-white/[0.07] rounded-2xl ${
        hover ? "card-hover hover:border-accent/25" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────
export function Stat({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: ReactNode;
}) {
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          {label}
        </span>
        {icon && <span className="text-accent/70">{icon}</span>}
      </div>
      <div className="mt-3 font-display font-extrabold text-3xl tracking-tight">
        {value}
      </div>
      {delta && (
        <div className="mt-1.5 flex items-center gap-1 text-[12px] text-emerald-400">
          <span className="w-3.5 h-3.5">{icons.arrowUp}</span>
          {delta}
        </div>
      )}
    </Card>
  );
}

// ── Badge ───────────────────────────────────────────────────────────
export function Badge({
  children,
  color = "#F97316",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        color,
        background: `${color}1A`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}

// ── Avatar (initialen) ──────────────────────────────────────────────
export function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold bg-accent/15 text-accent border border-accent/25"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

// ── Page header ─────────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-muted text-sm max-w-xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
