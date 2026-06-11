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
      .select(
        "id,name,ig_handle,status,monthly_value,package,videos_per_month,editor_cost,payment_status,created_at,soul_character_id,reference_image_url,brand_prompt"
      ),
    supabase
      .from("content")
      .select("id,client_id,title,hook,format,stage,published_at,permalink,posting_date,deadline"),
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
      soulCharacter: c.soul_character_id ?? null,
      referenceImage: c.reference_image_url ?? null,
      brandPrompt: c.brand_prompt ?? null,
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
      dateISO: x.posting_date ?? x.deadline ?? x.published_at ?? null,
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

// Eén klant met volledige brand-context (voor de detailpagina).
export async function getClient(id: string): Promise<Client | null> {
  if (DEMO_MODE || !isSupabaseConfigured) {
    const c = demoClients.find((x) => x.id === id);
    if (!c) return null;
    return {
      ...c,
      brandIdentity: `Persoonlijk merk van ${c.name}: een founder die transparant bouwt en deelt.`,
      brandStory: `${c.name} groeide van onbekend naar relevante autoriteit door consistent eerlijke, waardevolle content te delen — zonder fluff.`,
      brandStrategy: `Top-of-funnel: brede, herkenbare hooks. Mid-funnel: bewijs en klant-cases. Bottom-funnel: directe CTA richting ${c.handle}.`,
      brandVoice: "Direct, energiek, founder-naar-founder. Korte zinnen, geen jargon, geen clichés. Spreekt de kijker aan alsof het een goede vriend is.",
      notes: "Voorbeeld-context (demo).",
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const { data: c } = await supabase
    .from("clients")
    .select(
      "id,name,ig_handle,status,monthly_value,package,videos_per_month,editor_cost,payment_status,soul_character_id,reference_image_url,brand_prompt,brand_identity,brand_story,brand_strategy,brand_voice,notes"
    )
    .eq("id", id)
    .single();
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    handle: c.ig_handle ?? "",
    status: (c.status ?? "onboarding") as Client["status"],
    initials: initials(c.name),
    monthlyValue: Number(c.monthly_value ?? 0),
    revenueAttributed: 0,
    postsLive: 0,
    leadsThisMonth: 0,
    packageName: c.package ?? null,
    videosPerMonth: Number(c.videos_per_month ?? 0),
    editorCost: Number(c.editor_cost ?? 0),
    paymentStatus: (c.payment_status ?? "open") as Client["paymentStatus"],
    soulCharacter: c.soul_character_id ?? null,
    referenceImage: c.reference_image_url ?? null,
    brandPrompt: c.brand_prompt ?? null,
    brandIdentity: c.brand_identity ?? null,
    brandStory: c.brand_story ?? null,
    brandStrategy: c.brand_strategy ?? null,
    brandVoice: c.brand_voice ?? null,
    notes: c.notes ?? null,
  };
}
// ── Opdrachten per klant (prijs/kosten -> marge) ────────────────
export interface Order {
  id: string;
  title: string;
  deliverables: string | null;
  price: number;
  editorCost: number;
  otherCost: number;
  status: string; // open | bezig | review | klaar | gefactureerd
  deadline: string | null; // ISO date
  createdAt: string | null;
}

export async function getClientOrders(clientId: string): Promise<Order[]> {
  if (DEMO_MODE || !isSupabaseConfigured) {
    return [
      { id: "o1", title: "12 Reels — juni", deliverables: "12 reels: 4 per pijler. Scripts + edit + posten.", price: 2500, editorCost: 720, otherCost: 50, status: "bezig", deadline: null, createdAt: null },
      { id: "o2", title: "Founder-shoot Q3", deliverables: "Halve dag filmen, 30 ruwe clips.", price: 950, editorCost: 0, otherCost: 180, status: "open", deadline: null, createdAt: null },
    ];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("id,title,deliverables,price,editor_cost,other_cost,status,deadline,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    deliverables: o.deliverables ?? null,
    price: Number(o.price ?? 0),
    editorCost: Number(o.editor_cost ?? 0),
    otherCost: Number(o.other_cost ?? 0),
    status: o.status ?? "open",
    deadline: o.deadline ?? null,
    createdAt: o.created_at ?? null,
  }));
}

// Intake-antwoorden van een klant (voor de wizard, prefill).
export async function getIntakeAnswers(clientId: string): Promise<Record<string, string>> {
  if (DEMO_MODE || !isSupabaseConfigured) return {};
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase.from("clients").select("intake_answers").eq("id", clientId).single();
  return (data?.intake_answers as Record<string, string> | null) ?? {};
}
/* eslint-enable @typescript-eslint/no-explicit-any */
