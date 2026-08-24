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
  /** Soorten video's in de retainer, bv. "4× Talking, 2× Lifestyle" of "Alleen YouTube". */
  contentMix?: string | null;
  /** Asana-project-id als deze klant z'n eigen Asana-bord heeft (twee-weg-sync). */
  asanaProject?: string | null;
  editorCost: number;
  paymentStatus: PaymentStatus;
  createdThisMonth?: boolean; // nieuw deze maand
  // AI / Higgsfield Soul-character
  soulCharacter: string | null; // character-id/naam bij Higgsfield
  referenceImage: string | null; // url referentiefoto (bv. thumbnail)
  brandPrompt: string | null; // vaste stijl/branding-instructies
  // Brand-context (onboarding) — optioneel
  brandIdentity?: string | null;
  brandStory?: string | null;
  brandStrategy?: string | null;
  brandVoice?: string | null;
  notes?: string | null;
  // Brand-kleuren (sturen carousels/stories/thumbnails aan)
  brandPrimary?: string | null;
  brandSecondary?: string | null;
  ytChannel?: string | null; // YouTube kanaal-id of @handle (voor de sync)
  tiktokHandle?: string | null;
  /** Wie beheert deze klant (CSM). */
  manager?: string | null;
  /** Uit de klantenlijst gehaald zonder te verwijderen. */
  hidden?: boolean;
  /** goed | let_op | risico */
  health?: string | null;
  healthNote?: string | null;
  startDate?: string | null;
  /** Expliciete contactnaam in Moneybird (voor korte klantnamen). */
  moneybirdContact?: string | null;
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
  format: string;
  hook: string;
  assignee: string;
  due: string;
  views?: number;
  reach?: number;
  leads?: number;
  permalink?: string | null;
  dateISO?: string | null; // planningsdatum (posting_date of deadline) voor de kalender
  deadlineISO?: string | null; // wanneer de editor moet aanleveren
  postingISO?: string | null; // wanneer het live gaat
  briefUrl?: string | null; // files/brief-link (Frame.io, Drive) voor de editor
  editorId?: string | null; // toegewezen editor (voor het editor-board en de mails)
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
  /** Ruwe aanmaakdatum (ISO), voor groeperen per maand. */
  createdISO?: string | null;
  nextFollowup?: string | null; // ISO date — wanneer opvolgen
  followupNote?: string | null;
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
  /** Persoonlijke taak: 'vandaag' of 'later' (client-taken hebben dit niet). */
  urgency?: string | null;
  userId?: string | null;
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
  email?: string | null;
  payPerVideo: number;
  active: boolean;
  videosThisMonth: number;
  lateVideos: number; // te laat aangeleverd t.o.v. deadline
  // Editor-pool
  specialty?: string | null;
  poolStatus?: string; // actief | pool | gestopt
  contact?: string | null;
  portfolioUrl?: string | null;
  notes?: string | null;
  /** Op welke klant(en) deze editor zit — login ziet alleen die borden. */
  clientIds?: string[] | null;
}

export const editors: Editor[] = [
  { id: "e1", name: "Eva", payPerVideo: 60, active: true, videosThisMonth: 22, lateVideos: 1, specialty: "Talking head + captions", poolStatus: "actief", contact: "wa: +31 6…" },
  { id: "e2", name: "Sam", payPerVideo: 55, active: true, videosThisMonth: 14, lateVideos: 3, specialty: "Motion design", poolStatus: "actief", contact: "sam@mail.nl" },
  { id: "e3", name: "Tom", payPerVideo: 65, active: false, videosThisMonth: 0, lateVideos: 0, specialty: "Documentaire-stijl", poolStatus: "pool", contact: "Discord: tom#1234" },
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
  /** Kant-en-klaar DM-bericht — kopieer & verstuur vanaf de outreach-pagina. */
  message?: string | null;
  /** Wanneer de DM verstuurd is — voedt de "vandaag verstuurd"-teller. */
  dmSentAt?: string | null;
  /** 'top' = toplaag: persoonlijke Seth/Jack-behandeling i.p.v. standaard-opener. */
  tier?: string | null;
}

export const prospects: Prospect[] = [
  { id: "pr1", name: "FitMet Mark", instagram: "@fitmetmark", youtube: null, weakness: "Geen hooks, lage retentie", stage: "te_contacteren", potentialValue: 2500, note: "120k volgers, post inconsistent" },
  { id: "pr2", name: "Sanne Coacht", instagram: "@sannecoacht", youtube: "@sannecoacht", weakness: "Geen CTA, geen funnel", stage: "dm_verstuurd", potentialValue: 1800, note: null },
  { id: "pr3", name: "Bouwgroep Jansen", instagram: "@bouwjansen", youtube: null, weakness: "Amateuristische edits", stage: "in_gesprek", potentialValue: 3200, note: "Call gepland do" },
  { id: "pr4", name: "Lisa Skincare", instagram: "@lisa.skin", youtube: null, weakness: "Geen personal brand", stage: "audit_verstuurd", potentialValue: 2200, note: "Audit zeer positief ontvangen" },
  { id: "pr5", name: "TechFlow B.V.", instagram: "@techflow", youtube: "@techflow", weakness: "Founder niet zichtbaar", stage: "geen_reactie", potentialValue: 4000, note: "2x gevolgd, geen reactie" },
];

// ── Prompts-bibliotheek (herbruikbare AI-prompts) ──────────────────
export interface PromptTemplate {
  id: string;
  category: "Strategie" | "Content" | "Ideatie" | "Social";
  name: string;
  description: string;
  prompt: string; // het template dat (straks) naar Claude gaat
}

export const promptTemplates: PromptTemplate[] = [
  { id: "pt1", category: "Strategie", name: "Personal Brand-strategie", description: "Positionering, tone-of-voice, content-pijlers en een monetisatie-roadmap voor een founder.", prompt: "Maak een personal brand-strategie voor {{onderwerp}}: positionering, doelgroep, 3 content-pijlers, tone-of-voice en een 90-dagen roadmap." },
  { id: "pt2", category: "Content", name: "Content Atomizer", description: "Zet één kernstuk om in een week aan platform-native content.", prompt: "Neem dit kernstuk: {{onderwerp}}. Maak hieruit 7 platform-native posts (Reel, carrousel, story, tweet) voor één week, elk met hook + opzet." },
  { id: "pt3", category: "Content", name: "Reel-script", description: "Volledig reel-script: hook → verhaal → bewijs → CTA.", prompt: "Schrijf een 40-seconden reel-script over {{onderwerp}} met een scroll-stoppende hook, verhaal, bewijs en een duidelijke CTA." },
  { id: "pt4", category: "Ideatie", name: "Hook-generator", description: "10 scroll-stoppende hooks in verschillende invalshoeken.", prompt: "Genereer 10 scroll-stoppende hooks over {{onderwerp}}, gemixt in contrarian, authority, storytelling en curiosity-angles." },
  { id: "pt5", category: "Content", name: "Script Emulator", description: "Reverse-engineer de structuur van een sterke video en schrijf jouw script erin.", prompt: "Analyseer de structuur van deze video: {{onderwerp}}. Beschrijf de beat-voor-beat opbouw en schrijf vervolgens mijn eigen script in exact diezelfde structuur." },
  { id: "pt6", category: "Social", name: "Titel-generator", description: "30 klikwaardige titels uit één idee of referentie.", prompt: "Genereer 30 klikwaardige titels/onderschriften over {{onderwerp}}, gerangschikt op verwachte CTR." },
  { id: "pt7", category: "Social", name: "Thread-schrijver", description: "Virale 10–12 posts thread, in jouw stem.", prompt: "Schrijf een virale thread van 10-12 posts over {{onderwerp}}, met een sterke openingspost en een afsluitende CTA." },
  { id: "pt8", category: "Content", name: "Carrousel-bouwer", description: "Carrousel van 6–8 slides met kop + kernzin per slide.", prompt: "Maak een carrousel van 6-8 slides over {{onderwerp}}: per slide een korte kop + één kernzin, plus een CTA-slide." },
  { id: "pt9", category: "Content", name: "Nieuwsbrief-schrijver", description: "Van kop naar volledige nieuwsbrief via een vaste structuur.", prompt: "Schrijf een nieuwsbrief over {{onderwerp}}: pakkende kop, intro-hook, 3 kernpunten met voorbeelden en een CTA." },
];

// ── Eden: Capture-boards (second brain) ────────────────────────────
export interface Capture {
  id: string;
  board: string;
  kind: "link" | "youtube" | "note" | "idea" | "swipe";
  title: string;
  url: string | null;
  body: string | null;
  source: string | null;
}

export const captures: Capture[] = [
  { id: "cap1", board: "Swipe file", kind: "swipe", title: "Reel: 'Niemand zegt je dit over hooks'", url: "https://instagram.com/reel/demo", body: null, source: "@viralcreator" },
  { id: "cap2", board: "Swipe file", kind: "swipe", title: "Carrousel: 7 fouten van beginnende founders", url: "https://instagram.com/p/demo", body: null, source: "@buildinpublic" },
  { id: "cap3", board: "Ideeën", kind: "idea", title: "Serie: 'Ik bouw een agency in 30 dagen'", url: null, body: "Wekelijkse behind-the-scenes, transparant over omzet.", source: null },
  { id: "cap4", board: "Ideeën", kind: "note", title: "Hook-formule: pijn → twist → bewijs", url: null, body: "Werkt vooral voor talking-heads onder 30s.", source: null },
  { id: "cap5", board: "Inspiratie", kind: "link", title: "Artikel: retentie-curves uitgelegd", url: "https://example.com/retention", body: null, source: null },
];

// ── Eden: Discover (swipe-file van best presterende content) ───────
export interface DiscoverItem {
  id: string;
  title: string;
  creator: string;
  category: "Productiviteit" | "Zelfontwikkeling" | "Business" | "Health" | "Content";
  views: number;
  format: "Reel" | "Short" | "Carrousel";
}

export const discoverItems: DiscoverItem[] = [
  { id: "d1", title: "Zo plan ik 30 dagen content in 1 uur", creator: "@sannecoacht", category: "Productiviteit", views: 1240000, format: "Reel" },
  { id: "d2", title: "De 3 hooks die mij €40k opleverden", creator: "@daankoster", category: "Business", views: 842000, format: "Reel" },
  { id: "d3", title: "Stop met dagelijks posten — doe dit", creator: "@viralcreator", category: "Content", views: 2100000, format: "Short" },
  { id: "d4", title: "Mijn ochtendroutine als founder", creator: "@buildinpublic", category: "Zelfontwikkeling", views: 510000, format: "Reel" },
  { id: "d5", title: "7 tools die mijn workflow verdubbelden", creator: "@toolstack", category: "Productiviteit", views: 680000, format: "Carrousel" },
  { id: "d6", title: "Waarom niemand je content ziet", creator: "@growthlars", category: "Content", views: 1500000, format: "Reel" },
];

export const fmtEur = (n: number) =>
  "€" + n.toLocaleString("nl-NL", { maximumFractionDigits: 0 });

export const fmtNum = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n);
