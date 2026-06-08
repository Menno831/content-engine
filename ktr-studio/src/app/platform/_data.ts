// ════════════════════════════════════════════════════════════════
// MOCK DATA — clickable prototype van het KTR Studio platform.
// Niets hiervan is echt; puur om de look & flow te demonstreren.
// Bij de echte build komt dit uit de database (Supabase) + integraties.
// ════════════════════════════════════════════════════════════════

export const BRAND = {
  name: "KTR Studio",
  // White-label: per klant overschrijfbaar met eigen naam + accentkleur.
  accent: "#F97316",
};

export type ClientStatus = "actief" | "onboarding" | "gepauzeerd";

export type PaymentStatus = "betaald" | "open" | "te_laat";

export interface Client {
  id: string;
  name: string;
  handle: string;
  status: ClientStatus;
  initials: string;
  monthlyValue: number; // retainer per maand
  revenueAttributed: number; // omzet toegeschreven aan content deze maand
  postsLive: number;
  leadsThisMonth: number;
  // Finance
  packageName: string | null;
  videosPerMonth: number;
  editorCost: number;
  paymentStatus: PaymentStatus;
  createdThisMonth?: boolean; // nieuw deze maand
  // AI / Higgsfield Soul-character
  soulCharacter: string | null; // character-id/naam bij Higgsfield
  referenceImage: string | null; // url referentiefoto (bv. thumbnail)
  brandPrompt: string | null; // vaste stijl/branding-instructies
}

export const clients: Client[] = [
  { id: "c1", name: "Lars Vermeer", handle: "@larsbuilds", status: "actief", initials: "LV", monthlyValue: 2500, revenueAttributed: 18400, postsLive: 12, leadsThisMonth: 47, packageName: "Growth", videosPerMonth: 12, editorCost: 720, paymentStatus: "betaald", soulCharacter: "lars_soul_v2", referenceImage: null, brandPrompt: "Strakke tech-founder look, koel kleurenpalet, minimalistische kantoor-setting." },
  { id: "c2", name: "Sophie de Wit", handle: "@sophie.scales", status: "actief", initials: "SW", monthlyValue: 1800, revenueAttributed: 9200, postsLive: 9, leadsThisMonth: 31, packageName: "Starter", videosPerMonth: 8, editorCost: 480, paymentStatus: "open", soulCharacter: "sophie_soul_v1", referenceImage: null, brandPrompt: "Warme, toegankelijke uitstraling, natuurlijk licht, pastel-accenten." },
  { id: "c3", name: "Daan Koster", handle: "@daankoster", status: "actief", initials: "DK", monthlyValue: 3200, revenueAttributed: 27600, postsLive: 16, leadsThisMonth: 68, packageName: "Scale", videosPerMonth: 16, editorCost: 960, paymentStatus: "betaald", soulCharacter: "daan_soul_v3", referenceImage: null, brandPrompt: "Energieke ondernemer, high-contrast, dynamische crops, donkere achtergrond + oranje accent." },
  { id: "c4", name: "Imza Health", handle: "@imza.health", status: "onboarding", initials: "IH", monthlyValue: 2200, revenueAttributed: 0, postsLive: 0, leadsThisMonth: 4, packageName: "Growth", videosPerMonth: 12, editorCost: 720, paymentStatus: "open", createdThisMonth: true, soulCharacter: null, referenceImage: null, brandPrompt: "Klinisch & clean, wit + zachtgroen, vertrouwen uitstralend." },
  { id: "c5", name: "Noor Bakker", handle: "@noorbakker", status: "gepauzeerd", initials: "NB", monthlyValue: 1500, revenueAttributed: 3100, postsLive: 3, leadsThisMonth: 8, packageName: "Starter", videosPerMonth: 6, editorCost: 360, paymentStatus: "te_laat", soulCharacter: "noor_soul_v1", referenceImage: null, brandPrompt: "Speels en kleurrijk, lifestyle-setting, zonnig." },
];

// ── Content pipeline (kanban) ──────────────────────────────────────
export type PipelineStage =
  | "ideation"
  | "ready_for_editing"
  | "quality_control"
  | "revisions_needed"
  | "revisions_completed"
  | "client_approval"
  | "ready_for_posting"
  | "posted";

export const stageMeta: Record<PipelineStage, { label: string; hint: string }> = {
  ideation: { label: "Ideation", hint: "Hooks & concepten" },
  ready_for_editing: { label: "Ready for Editing", hint: "Klaar voor montage" },
  quality_control: { label: "Quality Control", hint: "Interne check" },
  revisions_needed: { label: "Revisions Needed", hint: "Aanpassen" },
  revisions_completed: { label: "Revisions Completed", hint: "Aangepast" },
  client_approval: { label: "Client Approval", hint: "Wacht op klant" },
  ready_for_posting: { label: "Ready for Posting", hint: "Klaar om te plannen" },
  posted: { label: "Posted", hint: "Gepubliceerd" },
};

export interface ContentCard {
  id: string;
  title: string;
  client: string;
  stage: PipelineStage;
  format: "Reel" | "Carrousel" | "Story" | "Short";
  hook: string;
  assignee: string;
  due: string;
  views?: number;
  reach?: number;
  leads?: number;
  permalink?: string | null;
  dateISO?: string | null; // planningsdatum (posting_date of deadline) voor de kalender
}

export const contentCards: ContentCard[] = [
  { id: "p1", title: "Waarom niemand je content ziet", client: "Lars Vermeer", stage: "ideation", format: "Reel", hook: "3 redenen waarom je reels floppen (en niemand zegt het je)", assignee: "AI", due: "5 jun" },
  { id: "p2", title: "Mijn grootste fout als founder", client: "Daan Koster", stage: "ideation", format: "Reel", hook: "Ik verloor €40k door deze ene aanname", assignee: "Menno", due: "6 jun" },
  { id: "p3", title: "Het 5-min content systeem", client: "Sophie de Wit", stage: "ready_for_editing", format: "Carrousel", hook: "Zo maak ik 30 posts in 1 uur", assignee: "Eva", due: "4 jun" },
  { id: "p4", title: "Cold DM teardown", client: "Lars Vermeer", stage: "quality_control", format: "Reel", hook: "Deze DM leverde een klant van €12k op", assignee: "AI", due: "7 jun" },
  { id: "p9", title: "De 'stop met X' hook", client: "Daan Koster", stage: "revisions_needed", format: "Reel", hook: "Stop met dagelijks posten — doe dit", assignee: "Eva", due: "5 jun" },
  { id: "p10", title: "3 tools die ik dagelijks gebruik", client: "Sophie de Wit", stage: "revisions_completed", format: "Carrousel", hook: "Mijn complete content-stack", assignee: "Eva", due: "4 jun" },
  { id: "p5", title: "Klant-resultaat reveal", client: "Daan Koster", stage: "client_approval", format: "Reel", hook: "0 → 300 leden in 90 dagen, hier is hoe", assignee: "Eva", due: "3 jun" },
  { id: "p6", title: "Founder ochtendroutine", client: "Sophie de Wit", stage: "ready_for_posting", format: "Short", hook: "De routine die mijn omzet verdubbelde", assignee: "Menno", due: "2 jun" },
  { id: "p7", title: "Hoe ik 1 klant closede via Reels", client: "Daan Koster", stage: "posted", format: "Reel", hook: "1 reel = 1 klant van €3.200", assignee: "Eva", due: "28 mei", views: 84200, reach: 96400, leads: 22, permalink: "https://www.instagram.com/reel/C8x1demo01/" },
  { id: "p8", title: "3 hooks die altijd werken", client: "Lars Vermeer", stage: "posted", format: "Carrousel", hook: "Steel deze 3 hooks", assignee: "AI", due: "26 mei", views: 51800, reach: 60200, leads: 14, permalink: "https://www.instagram.com/reel/C8x1demo02/" },
];

// ── Leads / sales pipeline (ManyChat → call → close) ───────────────
export type LeadStage = "nieuw" | "gekwalificeerd" | "call_gepland" | "closed" | "verloren";

export const leadStageMeta: Record<LeadStage, { label: string; color: string }> = {
  nieuw: { label: "Nieuwe lead", color: "#60A5FA" },
  gekwalificeerd: { label: "Gekwalificeerd", color: "#A78BFA" },
  call_gepland: { label: "Call gepland", color: "#FBBF24" },
  closed: { label: "Closed", color: "#34D399" },
  verloren: { label: "Verloren", color: "#6B7280" },
};

export interface Lead {
  id: string;
  name: string;
  source: string; // welke content / DM trigger
  client: string;
  stage: LeadStage;
  value: number;
  setter: string;
  date: string;
}

export const leads: Lead[] = [
  { id: "l1", name: "@thomas_grows", source: "Reel: 1 reel = 1 klant", client: "Daan Koster", stage: "closed", value: 3200, setter: "Set: Eva", date: "1 jun" },
  { id: "l2", name: "@marije.k", source: "ManyChat: 'GIDS'", client: "Lars Vermeer", stage: "call_gepland", value: 2500, setter: "Set: Menno", date: "2 jun" },
  { id: "l3", name: "@buildwithsam", source: "Carrousel: 3 hooks", client: "Lars Vermeer", stage: "gekwalificeerd", value: 2500, setter: "Set: Eva", date: "2 jun" },
  { id: "l4", name: "@founderfleur", source: "ManyChat: 'START'", client: "Sophie de Wit", stage: "nieuw", value: 1800, setter: "—", date: "3 jun" },
  { id: "l5", name: "@rickdoes", source: "Reel: klant-resultaat", client: "Daan Koster", stage: "closed", value: 3200, setter: "Set: Eva", date: "30 mei" },
  { id: "l6", name: "@joycevdberg", source: "ManyChat: 'GIDS'", client: "Sophie de Wit", stage: "verloren", value: 1800, setter: "Set: Menno", date: "29 mei" },
];

// ── Analytics: maandelijkse omzet uit content (12 mnd) ─────────────
export const revenueByMonth = [
  { m: "jul", v: 8200 }, { m: "aug", v: 11400 }, { m: "sep", v: 9800 },
  { m: "okt", v: 14600 }, { m: "nov", v: 21200 }, { m: "dec", v: 18900 },
  { m: "jan", v: 24800 }, { m: "feb", v: 31200 }, { m: "mrt", v: 28400 },
  { m: "apr", v: 39600 }, { m: "mei", v: 47800 }, { m: "jun", v: 55300 },
];

// Top presterende content
export const topContent = [
  { title: "1 reel = 1 klant van €3.200", client: "Daan Koster", views: 84200, reach: 96400, leads: 22, revenue: 9600, permalink: "https://www.instagram.com/reel/C8x1demo01/" },
  { title: "0 → 300 leden in 90 dagen", client: "Daan Koster", views: 67100, reach: 78300, leads: 18, revenue: 7400, permalink: "https://www.instagram.com/reel/C8x1demo03/" },
  { title: "Steel deze 3 hooks", client: "Lars Vermeer", views: 51800, reach: 60200, leads: 14, revenue: 5000, permalink: "https://www.instagram.com/reel/C8x1demo02/" },
  { title: "De routine die mijn omzet verdubbelde", client: "Sophie de Wit", views: 42300, reach: 49100, leads: 11, revenue: 3600, permalink: "https://www.instagram.com/reel/C8x1demo04/" },
  { title: "Ik verloor €40k door deze fout", client: "Daan Koster", views: 38900, reach: 44200, leads: 9, revenue: 2800, permalink: "https://www.instagram.com/reel/C8x1demo05/" },
];

// ── Studio: AI-gegenereerde hooks (mock output) ────────────────────
export const generatedHooks = [
  { hook: "Iedereen post elke dag — en niemand groeit. Dit is waarom.", angle: "Contrarian", score: 92 },
  { hook: "Ik analyseerde 1.000 virale reels. 3 dingen kwamen elke keer terug.", angle: "Authority", score: 88 },
  { hook: "Je hook is niet het probleem. Je eerste frame wel.", angle: "Pattern interrupt", score: 85 },
  { hook: "Stop met 'waarde geven'. Doe dit in plaats daarvan.", angle: "Controversieel", score: 81 },
];

// ── Notificaties (bell) ────────────────────────────────────────────
export interface Notification {
  id: string;
  type: "ideation" | "approval" | "todo" | "info";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  date: string;
}

export const notifications: Notification[] = [
  { id: "n1", type: "ideation", title: "Nieuwe ideation staat klaar", body: "3 nieuwe concepten voor je — bekijk en reageer.", link: "/platform/pipeline", read: false, date: "2u geleden" },
  { id: "n2", type: "approval", title: "Klant-resultaat reveal wacht op goedkeuring", body: "Daan Koster · Client Approval", link: "/platform/pipeline", read: false, date: "5u geleden" },
  { id: "n3", type: "todo", title: "Nieuwe taak: lever 3 ruwe clips aan", body: "Deadline vrijdag", link: "/platform/todos", read: true, date: "gisteren" },
];

// ── Content-to-do's per klant ──────────────────────────────────────
export interface Todo {
  id: string;
  client: string;
  title: string;
  done: boolean;
  due: string | null;
}

export const todos: Todo[] = [
  { id: "t1", client: "Daan Koster", title: "Lever 3 ruwe clips aan voor montage", done: false, due: "vr 6 jun" },
  { id: "t2", client: "Daan Koster", title: "Keur 'Klant-resultaat reveal' goed", done: false, due: "do 5 jun" },
  { id: "t3", client: "Sophie de Wit", title: "Stuur foto's voor carrousel", done: false, due: "ma 9 jun" },
  { id: "t4", client: "Lars Vermeer", title: "Bekijk ideation-batch juni", done: true, due: null },
];

// ── Editors (uitbetalingen + deadline-deducties) ───────────────────
export interface Editor {
  id: string;
  name: string;
  payPerVideo: number;
  active: boolean;
  videosThisMonth: number;
  lateVideos: number; // te laat aangeleverd t.o.v. deadline
}

export const editors: Editor[] = [
  { id: "e1", name: "Eva", payPerVideo: 60, active: true, videosThisMonth: 22, lateVideos: 1 },
  { id: "e2", name: "Sam", payPerVideo: 55, active: true, videosThisMonth: 14, lateVideos: 3 },
  { id: "e3", name: "Tom", payPerVideo: 65, active: false, videosThisMonth: 0, lateVideos: 0 },
];

// ── Team (logins + rollen) ─────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "team" | "editor" | "setter";
}

export const team: TeamMember[] = [
  { id: "u1", name: "Menno Kater", email: "menno@ktrstudio.nl", role: "owner" },
  { id: "u2", name: "Eva", email: "eva@ktrstudio.nl", role: "editor" },
  { id: "u3", name: "Jesse", email: "jesse@ktrstudio.nl", role: "editor" },
  { id: "u4", name: "Nienke", email: "nienke@ktrstudio.nl", role: "setter" },
];

/** 10% deductie per te late video. */
export const LATE_DEDUCTION = 0.1;

export function editorPayout(e: Editor) {
  const gross = e.videosThisMonth * e.payPerVideo;
  const deduction = e.lateVideos * e.payPerVideo * LATE_DEDUCTION;
  return { gross, deduction, net: gross - deduction };
}

// ── Outreach-pijplijn (nieuwe klanten werven) ──────────────────────
export type ProspectStage = "te_contacteren" | "dm_verstuurd" | "in_gesprek" | "audit_verstuurd" | "geen_reactie";

export const prospectStageMeta: Record<ProspectStage, { label: string; color: string }> = {
  te_contacteren: { label: "Te contacteren", color: "#60A5FA" },
  dm_verstuurd: { label: "DM verstuurd", color: "#A78BFA" },
  in_gesprek: { label: "In gesprek", color: "#FBBF24" },
  audit_verstuurd: { label: "Audit verstuurd", color: "#34D399" },
  geen_reactie: { label: "Geen reactie", color: "#6B7280" },
};

export interface Prospect {
  id: string;
  name: string;
  instagram: string | null;
  youtube: string | null;
  weakness: string | null;
  stage: ProspectStage;
  potentialValue: number;
  note: string | null;
}

export const prospects: Prospect[] = [
  { id: "pr1", name: "FitMet Mark", instagram: "@fitmetmark", youtube: null, weakness: "Geen hooks, lage retentie", stage: "te_contacteren", potentialValue: 2500, note: "120k volgers, post inconsistent" },
  { id: "pr2", name: "Sanne Coacht", instagram: "@sannecoacht", youtube: "@sannecoacht", weakness: "Geen CTA, geen funnel", stage: "dm_verstuurd", potentialValue: 1800, note: null },
  { id: "pr3", name: "Bouwgroep Jansen", instagram: "@bouwjansen", youtube: null, weakness: "Amateuristische edits", stage: "in_gesprek", potentialValue: 3200, note: "Call gepland do" },
  { id: "pr4", name: "Lisa Skincare", instagram: "@lisa.skin", youtube: null, weakness: "Geen personal brand", stage: "audit_verstuurd", potentialValue: 2200, note: "Audit zeer positief ontvangen" },
  { id: "pr5", name: "TechFlow B.V.", instagram: "@techflow", youtube: "@techflow", weakness: "Founder niet zichtbaar", stage: "geen_reactie", potentialValue: 4000, note: "2x gevolgd, geen reactie" },
];

export const fmtEur = (n: number) =>
  "€" + n.toLocaleString("nl-NL", { maximumFractionDigits: 0 });

export const fmtNum = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n);
