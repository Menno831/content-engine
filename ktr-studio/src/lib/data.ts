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
        "id,name,ig_handle,status,monthly_value,package,videos_per_month,editor_cost,payment_status,created_at,soul_character_id,reference_image_url,brand_prompt,brand_primary,brand_secondary"
      ),
    supabase
      .from("content")
      .select("id,client_id,title,hook,format,stage,published_at,permalink,posting_date,deadline,brief_url"),
    supabase
      .from("leads")
      .select("id,client_id,name,source_label,source_content_id,stage,value,setter,created_at,closed_at,next_followup,followup_note"),
    supabase
      .from("content_metrics")
      .select("content_id,views,reach,likes,comments,fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(5000),
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
      brandPrimary: c.brand_primary ?? null,
      brandSecondary: c.brand_secondary ?? null,
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
      // Editors plannen op posting_date/deadline; pas ná publicatie telt published_at.
      due: (() => {
        const d = x.posting_date ?? x.deadline ?? x.published_at;
        return d ? new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "—";
      })(),
      views: metric?.views ?? undefined,
      reach: metric?.reach ?? undefined,
      leads: leadsPerContent.get(x.id) ?? undefined,
      permalink: x.permalink ?? null,
      dateISO: x.posting_date ?? x.deadline ?? x.published_at ?? null,
      briefUrl: x.brief_url ?? null,
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
    nextFollowup: l.next_followup ?? null,
    followupNote: l.followup_note ?? null,
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
  const baseCols =
    "id,name,ig_handle,yt_channel_id,status,monthly_value,package,videos_per_month,editor_cost,payment_status,soul_character_id,reference_image_url,brand_prompt,brand_identity,brand_story,brand_strategy,brand_voice,notes,brand_primary,brand_secondary";
  // Nieuwe kolommen apart: als een migratie nog niet gedraaid is mag het
  // klantprofiel niet stuk — dan vallen we terug op de basiskolommen.
  let { data: c, error } = await supabase
    .from("clients")
    .select(`${baseCols},content_mix,asana_project_id`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    ({ data: c } = await supabase.from("clients").select(baseCols).eq("id", id).maybeSingle());
  }
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
    contentMix: c.content_mix ?? null,
    asanaProject: c.asana_project_id ?? null,
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
    brandPrimary: c.brand_primary ?? null,
    brandSecondary: c.brand_secondary ?? null,
    ytChannel: c.yt_channel_id ?? null,
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
  invoiceMonth: string | null; // ISO date (1e v.d. maand)
  invoiceRef: string | null; // factuurnummer/-referentie
}

export async function getClientOrders(clientId: string): Promise<Order[]> {
  if (DEMO_MODE || !isSupabaseConfigured) {
    return [
      { id: "o1", title: "12 Reels — juni", deliverables: "12 reels: 4 per pijler. Scripts + edit + posten.", price: 2500, editorCost: 720, otherCost: 50, status: "bezig", deadline: null, createdAt: null, invoiceMonth: "2026-06-01", invoiceRef: "2026-014" },
      { id: "o2", title: "Founder-shoot Q3", deliverables: "Halve dag filmen, 30 ruwe clips.", price: 950, editorCost: 0, otherCost: 180, status: "open", deadline: null, createdAt: null, invoiceMonth: "2026-07-01", invoiceRef: null },
    ];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("id,title,deliverables,price,editor_cost,other_cost,status,deadline,created_at,invoice_month,invoice_ref")
    .eq("client_id", clientId)
    .order("invoice_month", { ascending: false })
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
    invoiceMonth: o.invoice_month ?? null,
    invoiceRef: o.invoice_ref ?? null,
  }));
}

// ── Transcripten per klant (brand voice bron) ───────────────────
export interface TranscriptMeta {
  id: string;
  title: string;
  chars: number;
  createdAt: string | null;
}

export async function getClientTranscripts(clientId: string): Promise<TranscriptMeta[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("transcripts")
    .select("id,title,content,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    chars: (t.content as string | null)?.length ?? 0,
    createdAt: t.created_at ?? null,
  }));
}

// ── Rapportage: periode-vergelijking per klant ──────────────────
// Op basis van publicatiedatum + laatste metric-snapshot per post.
// Geen data in een periode = nul; delta's toont de UI alleen als de
// vorige periode ook echt data had ("echte data of niets").
export interface PeriodStats {
  posts: number;
  views: number;
  likes: number;
  comments: number;
}

export interface ClientReport {
  week: PeriodStats;
  prevWeek: PeriodStats;
  month: PeriodStats;
  prevMonth: PeriodStats;
  bySource: { instagram: number; youtube: number }; // posts afgelopen 30 dagen
}

export async function getClientReport(clientId: string): Promise<ClientReport | null> {
  if (DEMO_MODE || !isSupabaseConfigured) return null;
  const supabase = await createClient();
  if (!supabase) return null;

  const [{ data: contentRows }, { data: metricRows }] = await Promise.all([
    supabase
      .from("content")
      .select("id,published_at,source")
      .eq("client_id", clientId)
      .not("published_at", "is", null),
    supabase
      .from("content_metrics")
      .select("content_id,views,likes,comments,fetched_at")
      .order("fetched_at", { ascending: false }),
  ]);

  const latest = new Map<string, { views: number; likes: number; comments: number }>();
  for (const m of metricRows ?? []) {
    if (!latest.has(m.content_id)) {
      latest.set(m.content_id, {
        views: Number(m.views ?? 0),
        likes: Number(m.likes ?? 0),
        comments: Number(m.comments ?? 0),
      });
    }
  }

  const now = Date.now();
  const DAY = 86_400_000;
  const empty = (): PeriodStats => ({ posts: 0, views: 0, likes: 0, comments: 0 });
  const week = empty();
  const prevWeek = empty();
  const month = empty();
  const prevMonth = empty();
  const bySource = { instagram: 0, youtube: 0 };

  for (const c of contentRows ?? []) {
    const t = new Date(c.published_at as string).getTime();
    const age = now - t;
    if (age < 0) continue;
    const m = latest.get(c.id) ?? { views: 0, likes: 0, comments: 0 };
    const add = (p: PeriodStats) => {
      p.posts += 1;
      p.views += m.views;
      p.likes += m.likes;
      p.comments += m.comments;
    };
    if (age <= 7 * DAY) add(week);
    else if (age <= 14 * DAY) add(prevWeek);
    if (age <= 30 * DAY) {
      add(month);
      if (String(c.source ?? "").startsWith("instagram")) bySource.instagram += 1;
      if (c.source === "youtube") bySource.youtube += 1;
    } else if (age <= 60 * DAY) add(prevMonth);
  }

  return { week, prevWeek, month, prevMonth, bySource };
}

// ── Daily Brief: vandaag's ideeën per klant ─────────────────────
export interface BriefIdeaRow {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  angle: string | null;
  hook: string | null;
  why: string | null;
  status: string;
}

export async function getTodaysBrief(): Promise<BriefIdeaRow[]> {
  if (DEMO_MODE || !isSupabaseConfigured) {
    return [
      { id: "b1", clientId: "c1", clientName: "Lars Vermeer", title: "De €0-marketing leugen", angle: "Contrair op 'gratis bereik'", hook: "Iedereen roept 'organisch is gratis'. Het kostte mij 40 uur per week.", why: "Breekt een geloof af dat je doelgroep dagelijks hoort.", status: "nieuw" },
      { id: "b2", clientId: "c1", clientName: "Lars Vermeer", title: "1 klant = 1 reel", angle: "Klant-case bewijs", hook: "Deze ene reel leverde een klant van €3.200 op. Hier is 'm.", why: "Concreet resultaat verslaat elke algemene tip.", status: "nieuw" },
      { id: "b3", clientId: "c2", clientName: "Sophie de Wit", title: "Waarom consistent posten niet werkt", angle: "Mythe doorprikken", hook: "Je hoeft niet elke dag te posten. Je moet dit doen.", why: "Spreekt de frustratie van je doelgroep direct aan.", status: "nieuw" },
    ];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rows }, { data: clientRows }] = await Promise.all([
    supabase
      .from("brief_ideas")
      .select("id,client_id,title,angle,hook,why,status")
      .eq("brief_date", today)
      .neq("status", "verborgen")
      .order("created_at", { ascending: true }),
    supabase.from("clients").select("id,name"),
  ]);
  const nameById = new Map((clientRows ?? []).map((c) => [c.id, c.name]));
  return (rows ?? []).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: nameById.get(r.client_id) ?? "—",
    title: r.title,
    angle: r.angle ?? null,
    hook: r.hook ?? null,
    why: r.why ?? null,
    status: r.status ?? "nieuw",
  }));
}

// ── Daily Brief: vandaag's ideeën per klant ───────────────────── END

// ── Generatie-historie (AI Visuals / thumbnails) ────────────────
export interface Generation {
  id: string;
  clientId: string | null;
  prompt: string;
  url: string;
  createdAt: string | null;
}

export async function getGenerations(limit = 24): Promise<Generation[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("generations")
    .select("id,client_id,prompt,output_url,created_at")
    .eq("kind", "image")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .filter((g) => g.output_url)
    .map((g) => ({
      id: g.id,
      clientId: g.client_id ?? null,
      prompt: g.prompt ?? "",
      url: g.output_url as string,
      createdAt: g.created_at ?? null,
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
