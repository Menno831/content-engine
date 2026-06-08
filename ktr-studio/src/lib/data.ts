// ════════════════════════════════════════════════════════════════
// Datalaag: één plek die beslist tussen demo-data en echte Supabase-data.
// DEMO_MODE of geen Supabase -> demo-bundle (met banner in de UI).
// Anders -> echte queries; lege resultaten leveren lege staten op.
// ════════════════════════════════════════════════════════════════
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  clients as demoClients,
  contentCards as demoContent,
  leads as demoLeads,
  revenueByMonth as demoRevenue,
  topContent as demoTop,
  type Client,
  type ContentCard,
  type Lead,
} from "@/app/platform/_data";

export interface WorkspaceData {
  demo: boolean;
  clients: Client[];
  content: ContentCard[];
  leads: Lead[];
  revenueByMonth: { m: string; v: number }[];
  topContent: {
    title: string;
    client: string;
    views: number;
    reach: number;
    leads: number;
    revenue: number;
    permalink: string | null;
  }[];
}

function demoBundle(): WorkspaceData {
  return {
    demo: true,
    clients: demoClients,
    content: demoContent,
    leads: demoLeads,
    revenueByMonth: demoRevenue,
    topContent: demoTop,
  };
}

const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getWorkspaceData(): Promise<WorkspaceData> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoBundle();
  const supabase = await createClient();
  if (!supabase) return demoBundle();

  const [clientsRes, contentRes, leadsRes, metricsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,ig_handle,status,monthly_value,package,videos_per_month,editor_cost,payment_status,created_at"),
    supabase.from("content").select("id,client_id,title,hook,format,stage,published_at,permalink"),
    supabase
      .from("leads")
      .select("id,client_id,name,source_label,source_content_id,stage,value,setter,created_at,closed_at"),
    supabase
      .from("content_metrics")
      .select("content_id,views,reach,likes,comments,fetched_at")
      .order("fetched_at", { ascending: false }),
  ]);

  const clientRows = clientsRes.data ?? [];
  const contentRows = contentRes.data ?? [];
  const leadRows = leadsRes.data ?? [];
  const metricRows = metricsRes.data ?? [];

  const nameById = new Map<string, string>(clientRows.map((c) => [c.id, c.name]));

  // Laatste metric per content (metricRows is al aflopend gesorteerd).
  const latestMetric = new Map<string, any>();
  for (const m of metricRows) if (!latestMetric.has(m.content_id)) latestMetric.set(m.content_id, m);

  // Leads per bron-content.
  const leadsPerContent = new Map<string, number>();
  for (const l of leadRows)
    if (l.source_content_id)
      leadsPerContent.set(l.source_content_id, (leadsPerContent.get(l.source_content_id) ?? 0) + 1);

  const now = new Date();
  const inThisMonth = (d?: string | null) => {
    if (!d) return false;
    const x = new Date(d);
    return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
  };

  const clients: Client[] = clientRows.map((c) => {
    const cLeads = leadRows.filter((x) => x.client_id === c.id);
    return {
      id: c.id,
      name: c.name,
      handle: c.ig_handle ?? "",
      status: (c.status ?? "onboarding") as Client["status"],
      initials: initials(c.name),
      monthlyValue: Number(c.monthly_value ?? 0),
      revenueAttributed: cLeads
        .filter((l) => l.stage === "closed" && inThisMonth(l.closed_at))
        .reduce((s, l) => s + Number(l.value ?? 0), 0),
      postsLive: contentRows.filter((x) => x.client_id === c.id && x.stage === "posted").length,
      leadsThisMonth: cLeads.filter((l) => inThisMonth(l.created_at)).length,
      packageName: c.package ?? null,
      videosPerMonth: Number(c.videos_per_month ?? 0),
      editorCost: Number(c.editor_cost ?? 0),
      paymentStatus: (c.payment_status ?? "open") as Client["paymentStatus"],
      createdThisMonth: inThisMonth(c.created_at),
    };
  });

  const content: ContentCard[] = contentRows.map((x) => {
    const metric = latestMetric.get(x.id);
    return {
      id: x.id,
      title: x.title,
      client: nameById.get(x.client_id) ?? "—",
      stage: x.stage as ContentCard["stage"],
      format: (x.format ?? "Reel") as ContentCard["format"],
      hook: x.hook ?? "",
      assignee: "—",
      due: x.published_at
        ? new Date(x.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
        : "—",
      views: metric?.views ?? undefined,
      reach: metric?.reach ?? undefined,
      leads: leadsPerContent.get(x.id) ?? undefined,
      permalink: x.permalink ?? null,
    };
  });

  const leads: Lead[] = leadRows.map((l) => ({
    id: l.id,
    name: l.name ?? "—",
    source: l.source_label ?? "—",
    client: nameById.get(l.client_id) ?? "—",
    stage: l.stage as Lead["stage"],
    value: Number(l.value ?? 0),
    setter: l.setter ?? "—",
    date: l.created_at
      ? new Date(l.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
      : "—",
  }));

  const revenueByMonth = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const v = leadRows
      .filter(
        (l) =>
          l.stage === "closed" &&
          l.closed_at &&
          new Date(l.closed_at).getMonth() === d.getMonth() &&
          new Date(l.closed_at).getFullYear() === d.getFullYear()
      )
      .reduce((s, l) => s + Number(l.value ?? 0), 0);
    return { m: MONTHS[d.getMonth()], v };
  });

  const topContent = content
    .map((x) => ({
      title: x.title,
      client: x.client,
      views: x.views ?? 0,
      reach: x.reach ?? 0,
      leads: x.leads ?? 0,
      revenue: leadRows
        .filter((l) => l.source_content_id === x.id && l.stage === "closed")
        .reduce((s, l) => s + Number(l.value ?? 0), 0),
      permalink: x.permalink ?? null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return { demo: false, clients, content, leads, revenueByMonth, topContent };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
