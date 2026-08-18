import Link from "next/link";
import { PageHeader, Card, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { getEditors } from "@/lib/editors";
import { stageMeta, type PipelineStage } from "../_data";
import { ClientFilter } from "../ClientFilter";
import { CalendarItem } from "./CalendarItem";

const stageColor: Record<string, string> = {
  ideation: "#F97316",
  ready_for_editing: "#FB923C",
  quality_control: "#A78BFA",
  revisions_needed: "#F87171",
  revisions_completed: "#FBBF24",
  client_approval: "#60A5FA",
  ready_for_posting: "#34D399",
  posted: "#22C55E",
};

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; client?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (sp.m && /^\d{4}-\d{2}$/.test(sp.m)) {
    const [y, mo] = sp.m.split("-").map(Number);
    year = y;
    month = mo - 1;
  }

  const [{ content: allContent, clients, demo }, ctx] = await Promise.all([getWorkspaceData(), getSessionContext()]);
  // Owner/team mag vanaf de kalender direct bewerken; klant/editor niet hier.
  const canEdit = !demo && ctx.profile?.role !== "client" && ctx.profile?.role !== "editor";
  const editors = canEdit ? await getEditors() : [];
  const editorOptions = editors.map((e) => ({ id: e.id, label: e.name }));
  const activeClient = clients.find((c) => c.id === sp.client);
  const content = activeClient ? allContent.filter((c) => c.client === activeClient.name) : allContent;
  const clientQS = sp.client ? `&client=${sp.client}` : "";

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // ma = 0

  // Content per dag.
  const byDay = new Map<number, typeof content>();
  content.forEach((c, i) => {
    let day: number | null = null;
    if (c.dateISO) {
      const d = new Date(c.dateISO);
      if (d.getFullYear() === year && d.getMonth() === month) day = d.getDate();
    } else if (demo) {
      // Demo zonder echte datum -> spreid deterministisch over de maand.
      day = ((i * 5 + 3) % daysInMonth) + 1;
    }
    if (day) {
      const arr = byDay.get(day) ?? [];
      arr.push(c);
      byDay.set(day, arr);
    }
  });

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const cells = Array.from({ length: firstDay + daysInMonth });
  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  return (
    <>
      <PageHeader
        eyebrow="Kalender"
        title="Content-planning"
        subtitle="Alle geplande en gepubliceerde content in één maandoverzicht, gekleurd per fase."
        action={
          <div className="flex items-center gap-2">
            <Link href={`/platform/calendar?m=${ym(prev)}${clientQS}`} className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.08] hover:border-accent/30 text-muted hover:text-foreground transition-all">‹</Link>
            <span className="font-display font-bold text-sm w-32 text-center capitalize">{MONTHS[month]} {year}</span>
            <Link href={`/platform/calendar?m=${ym(next)}${clientQS}`} className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.08] hover:border-accent/30 text-muted hover:text-foreground transition-all">›</Link>
          </div>
        }
      />

      <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} />

      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-mono uppercase tracking-wider text-muted py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((_, idx) => {
            const day = idx - firstDay + 1;
            if (day < 1) return <div key={idx} className="min-h-[96px] rounded-lg bg-white/[0.01]" />;
            const items = byDay.get(day) ?? [];
            const isToday = day === todayDay;
            return (
              <div key={idx} className={`min-h-[96px] rounded-lg border p-1.5 ${isToday ? "border-accent/40 bg-accent/[0.05]" : "border-white/[0.05] bg-white/[0.01]"}`}>
                <div className={`text-[11px] mb-1 px-1 ${isToday ? "text-accent font-bold" : "text-muted"}`}>{day}</div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((c) => (
                    <CalendarItem
                      key={c.id}
                      contentId={c.id}
                      title={c.title}
                      color={stageColor[c.stage] ?? "#9CA3AF"}
                      tooltip={`${c.title} · ${stageMeta[c.stage as PipelineStage]?.label ?? ""}`}
                      editable={canEdit}
                      editors={editorOptions}
                    />
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted px-1">+{items.length - 3} meer</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(stageColor).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {stageMeta[stage as PipelineStage]?.label ?? stage}
          </div>
        ))}
      </div>
    </>
  );
}
