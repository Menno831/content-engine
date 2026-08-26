# RUNBOOK — openstaande uitvoer-acties

Voor een Claude Code-sessie **met netwerktoegang** (zie CLAUDE.md voor context).
Doel: alles hieronder zelf uitvoeren, zonder dat Menno hoeft te plakken.

## Benodigde omgeving
Environment-variabelen (via de environment-instellingen, nooit in chat/commits):
- `SUPABASE_ACCESS_TOKEN` — personal access token (supabase.com/dashboard/account/tokens); hiermee kan SQL via de Management API: `POST https://api.supabase.com/v1/projects/{ref}/database/query` met body `{"query":"..."}`
- `SUPABASE_PROJECT_REF` — het project-ref (staat in de Supabase-URL)
- `VERCEL_TOKEN` — vercel.com/account/tokens; voor env-vars zetten + redeploy via de Vercel API
(18 aug: geen van deze drie was nodig — SQL is via de ingelogde Chrome-sessie in de
Supabase SQL Editor gedraaid, Vercel via de lokaal ingelogde CLI.)

## Openstaande acties (aug 2026)
1. **Vercel-envs aanvullen** (project content-engine-kr5c, root `ktr-studio`):
   `RESEND_API_KEY` en `YOUTUBE_API_KEY` ontbreken nog — waarden alleen bij Menno.
   `MONEYBIRD_API_TOKEN` staat er maar de waarde is verhaspeld (token meerdere keren
   achter elkaar geplakt); de code vangt dit sinds 18 aug op, maar netjes opnieuw
   zetten blijft beter. Na het zetten: redeploy zonder build-cache.

3. **Outreach-berichten** — grotendeels afgehandeld op 24 aug: de 165
   wachtrij-DM's stonden al in de goede stijl (positief-nieuwsgierig, geen
   negging), en de 100 audit-prospects hebben nu 86 handgeschreven
   concept-DM's in diezelfde stijl in het berichtveld (13 overgeslagen omdat
   ze al met een bericht in de wachtrij staan, 1 was al gemarkeerd als
   dubbel). De oude negging-teksten staan alleen nog in de interne
   notitie/waarom-fit-velden — die ziet de prospect nooit. Afgerond op
   24 aug: voor de toplaag is de "waarom fit" onderbouwd met echte
   vidIQ-cijfers (subs/views/groei/output van 24 aug) en zijn de openers
   aangescherpt op één concreet ding per kanaal; Jia Ruan uit de toplaag
   (stond als geen fit in de wachtrij). Brede-laag-research blijft open.
4. **Rapporten-databronnen**: IG-sync draait en vult content+metrics (3 klanten).
   YouTube wacht op `YOUTUBE_API_KEY`; alternatieve bronnen waar al abonnementen
   op lopen: vidIQ, Metricool, Instagram-app-exports. ManyChat-koppeling voor
   reply-detectie op outreach (auto "geen reactie"-scan) is een latere stap.

## Wat er nog niet werkt (20 aug 2026)
Alles uit de AgencyBase-referentie is nu gebouwd, op één ding na, en dat
wacht op iets buiten de code:
- **Messages (gedeelde IG-DM-inbox)** — kan niet zonder Instagram Messaging
  API (Meta-app met `instagram_manage_messages`, review vereist) of een
  ManyChat-abonnement met inbox-API. Nu al wel: leads uit ManyChat komen
  binnen via `/api/manychat`, en DM's versturen gaat handmatig vanaf Outreach.

Keys: ALLES GROEN (25 aug 2026) — Anthropic (incl. tegoed), YouTube, Resend,
RapidAPI, Moneybird, Asana, CRON_SECRET, MANYCHAT_WEBHOOK_SECRET. Zelftest: 0
defecten; eerste 10 AI-concept-DM's staan in de wachtrij. Alleen nog optioneel:
CLARITY_API_TOKEN opnieuw (huidige geeft 403 — Data export activeren in
Clarity), ManyChat External Request in de default-flow, Resend-domein-DNS.

## Afgerond (18-25 aug 2026)
- **DM-flow één-klik** (25 aug): "Open DM + kopieer bericht" opent ig.me en
  zet het bericht op het klembord; daarna ✓ Verstuurd-knop → dagteller.
  **Reply-keten**: webhook `/api/manychat-reply` (secret in Vercel) matcht
  prospect op handle, zet stage op in_gesprek, slaat reply op, schrijft
  AI-conceptantwoord (zodra key werkt) en meldt in de bel; bewaker zet
  7 dagen stilte automatisch op geen_reactie. End-to-end live getest.
  ManyChat: Menno moet de External Request nog in zijn default-flow zetten.
- **Outreach-toplaag (migratie 032 — gedraaid):** ster per prospect, filter
  met het Seth/Jack-playbook (voice notes, case, zelfde dag call), 18
  hoogste-potentie prospects voorgeselecteerd.
- **Opruimronde na de review:** één `requireTeam()`-helper voor alle
  team-acties, DM-prompt en weekanalyse gedeeld tussen cron en knoppen
  (geen dubbele prompts meer die uit elkaar groeien), één `todayStr()`
  (lokale datum) door het hele platform i.p.v. UTC/lokaal door elkaar,
  Eigen-kanalen-bord ververst via de server (geen tmp-rijen meer),
  channels-pagina parallel + zuinige limiet, maxDuration op de
  kanalen-cron. Migraties 027-031 in Supabase geverifieerd: staan allemaal.
- **Ondertekenbare documenten** (migratie 031 — gedraaid): NDA-sjabloon voor
  editors + klant-overeenkomst op Contracten, publieke ondertekenpagina
  `/sign/<token>` met naam+tijdstempel, status springt automatisch op
  getekend. End-to-end live getest (aanmaken → tekenen → getekend → opgeruimd).
- **Review-fixes ronde 2 (migratie 031 — gedraaid):** groeiplan/briefing per
  agency gescoped (cross-tenant datamix gedicht), agencies-updatepolicy zodat
  "Bronnen opslaan" op Eigen kanalen echt werkt, kanaal-metingen dragen een
  bron (handmatig/sync), formulier-teller atomair, Moneybird-contactnaam-veld
  per klant (Profiel → kanalen; nodig voor korte namen als A&B), kanban
  sorteert nieuwste eerst, rol-check op meting-verwijderen.
- ⚠️ **CRON_SECRET is nu verplicht:** de cron-endpoints (watchdog,
  sync-channels) staan DICHT tot Menno `CRON_SECRET` in Vercel zet (ze waren
  publiek aanroepbaar en konden AI-kosten maken). Genereer een willekeurige
  waarde (bv. `openssl rand -hex 24`) en zet hem via `vercel env add
  CRON_SECRET production`; Vercel stuurt hem daarna zelf mee aan de crons.
- **Jarvis** (`/platform/jarvis`, migratie 030 — gedraaid): spraak in/uit
  (Web Speech nl-NL, geen key nodig), ochtendbriefing op echte cijfers
  (regelgebaseerd, AI-laag zodra ANTHROPIC_API_KEY werkt; live geverifieerd),
  chat met gespreksgeschiedenis (wacht op de key en zegt dat zelf), dagelijkse
  briefing via de watchdog-cron. Watchdog doet nu ook een zelftest die kapotte
  koppelingen als notificatie meldt.
- **Automatiseringsmotor** (cron 07:30 `/api/cron/watchdog`): dagelijkse
  signalen in de bel (dedupe 3 dagen, werkt — geverifieerd), AI-concept-DM's
  voor de outreach-wachtrij (max 10/dag, nooit auto-verzenden) en maandag-
  weekanalyse op het groeiplan; beide AI-takken wachten op een werkende
  ANTHROPIC_API_KEY en melden dat nu expliciet i.p.v. stil niets doen.
- **Eigen kanalen** (`/platform/channels`, migratie 027 — gedraaid): website,
  Instagram, LinkedIn en YouTube met dag-snapshots, delta's en sparklines;
  invoer per kanaal, live getest. Rollen-guard op het klant-werkstation
  (editor → board, klantlogin → portaal, ook bij directe URL).
- **Tijdlijn (Gantt)** op het productieboard: balk van aanleveren tot live,
  4/6/12 weken, altijd één week geschiedenis mee zodat kaarten die over tijd
  zijn zichtbaar blijven (rode rand).
- **Klant-werkstation** met tabs Pipeline/Stats/Stories/Leads/Revenue/Links/
  Calls/Health/Profiel; EOD, Agenda, leadformulieren (publieke `/f/<token>`),
  contracten, advertentie-rendement, kanban + sub-boards per formaat.
- **Moneybird-check**: "invalid header value"-fout gefixt (token-sanering + token
  nooit meer in de foutmelding) en live geverifieerd: Finance toont facturen
  (€6.377 gefactureerd deze maand).
- **Outreach-import**: 265 prospects (100 audit-bord + 165 DM-bord) via Monday-MCP
  ingelezen en idempotent in `prospects` gezet (external_id `monday-audit:<id>` /
  `monday-dm:<id>`, statusmap volgens dit runbook, DM variant A/B als message).
- **Scripts-import**: 34 scripts in `scripts` (21 YouTube-scripts + batchdag-draaiboek
  uit de scripts-hub van mennokater.nl, 13 story-scripts uit de live blob, tags
  YouTube EN/NL, Draaiboek, Story; status `to_record`). Reels-scripts bewust niet:
  die leven in de content-hub met animatielagen.
- **Spook-agency opgeruimd**: alleen agency "KTR Studio" over (265 prospects,
  34 scripts, 3 klanten hangen eraan).
- **Migraties 010–022**: `migrate.sql` integraal gedraaid, succesvol.

## Afvinken
Werk deze lijst bij (verwijder afgeronde punten) en commit, zodat de volgende
sessie niet dubbel werk doet.

## Ronde 25 aug 2026 — Frame.io + bulk-acties + opschoning

- **Frame.io-koppeling gebouwd** (`lib/frameio.ts` + watchdog stap 3c + migratie 034):
  bewaker checkt dagelijks project 23f1a12a… op nieuwe uploads → melding in de bel
  + Frame-link automatisch op de kaart met matchende titel. Eerste run registreert
  bestaand archief stil. Project-id staat in `agencies.frameio_project_id` (gezet).
  **Wacht op keys van Menno:** FRAMEIO_CLIENT_ID + FRAMEIO_CLIENT_SECRET in Vercel
  (Adobe Developer Console → nieuw project → "Frame.io API" toevoegen →
  Server-to-Server credential). Zelftest meldt dit tot de keys er staan.
- **Bulk-selectie op het productieboard:** checkbox per kaart + zwevende balk
  (Move to…/Delete/✕). Live getest: 2 kaarten bulk verplaatst.
- **Filters opgeschoond:** "Alle klanten"-knop weg (chip nogmaals klikken = filter
  uit), format-chips van het board verwijderd.
- **5 klanten verwijderd** op verzoek via de app: Ad Guardians, FX Minds, IB Groups,
  Jisk Hogenboom, Scale Academy. Over: Menno Kater, Arthur and Bryan, Jip Geuke,
  Verkoop je Zaak.

## Ronde 25 aug 2026 (2) — Finance-uitbouw + outreach-IG

- Finance: stat "Omzet deze maand" naast MRR (met concepten-delta), jaargrafiek
  jan-dec (omzet / concepten gestippeld / prognose op MRR) + YTD omzet en winst,
  kaart "Nog te versturen" met alle Moneybird-concepten (`getMoneybirdDrafts`).
- Outreach: igHandle haalt nu de eerste @handle uit annotatie-tekst
  ("@naam (~108K)") → 219 werkende IG-links, 0 kapot. Watchdog stap 3d vult
  lege instagram-velden via YouTube-kanaalbeschrijvingen (max 25/run).

## Ronde 25 aug 2026 (3) — prospect-kwalificatie

- lib/qualify.ts + /api/cron/qualify + migratie 035 + watchdog stap 2b:
  elke te-contacteren-prospect gecheckt op high-ticket aanbod (AI) en
  "YouTube loopt al te goed" (>=20K gem. views laatste 10 uploads).
- Volledige run gedraaid: 228 beoordeeld -> 167 high-ticket ✓, 41 twijfel
  (amber-label, handmatig scannen), 20 afgekeurd naar nieuwe stage
  'afgekeurd' met reden op de kaart. Toplaag (17) bewust overgeslagen.
- Nieuwe imports worden voortaan dagelijks door de bewaker gekwalificeerd.

## Ronde 25 aug 2026 (4) — DM-sprint

- Auto-send naar onbekenden bewust NIET gebouwd (IG-ToS/accountrisico +
  versturen blijft menselijk). In plaats daarvan: SprintMode.tsx op Outreach —
  wachtrij van te-contacteren-prospects met AI-opener + werkende IG-handle
  (toplaag eerst), per prospect 2 klikken: open DM + klembord, verstuurd →
  kaart schuift naar dm_verstuurd. 151 stonden klaar bij livegang.
- Fix: stage 'afgekeurd' toegevoegd aan STAGES in outreach/actions.ts
  (terugzetten/handmatig afkeuren werkte anders niet).

## Ronde 25 aug 2026 (5) — KTR DM Runner (extensie)

- extension/: Chrome-extensie die bij "⚡ Run 10" in de sprint max 10 DM-tabs
  opent (3s tempo) en het klaargezette bericht alvast in de composer typt
  (insertText — methode gevalideerd op de echte IG-composer). Verstuurt zelf
  NOOIT; vult ook nooit een niet-lege composer. Sprint toont de Run-knop
  alleen als de extensie is geïnstalleerd (marker op <html>), en heeft een
  "allemaal verstuurd → markeer 10"-afvinkstap.
- Installatie door Menno (eenmalig): chrome://extensions → Ontwikkelaarsmodus
  → Uitgepakt laden → map ~/content-engine/ktr-studio/extension (zie
  extension/README.md).

## Ronde 26 aug 2026 — mobiel volledig gefixt

- HOOFDBUG gevonden: de header heeft backdrop-blur; een element met
  backdrop-filter wordt containing block voor fixed descendants, waardoor
  het mobiele menu (fixed inset-0 in de header) in de 64px hoge header
  geklemd werd — navigeren op telefoon was onmogelijk. Fix: Portal.tsx,
  alle header-overlays (MobileNav, CommandPalette, NotificationsBell)
  renderen nu op <body>.
- Bel-paneel: op mobiel full-width (viel 17px buiten beeld), via portal.
- Klanten: actieknoppen wrappen; Jarvis-chat strip markdown-sterretjes.
- Getest op 390px in Menno's ingelogde sessie (iframe-methode): alle 19
  routes geladen zonder horizontale overflow of errors; visueel gecheckt:
  dashboard, pipeline, outreach, finance, jarvis, groei, clients, agenda;
  menu-open + navigatie + ⌘K + bel functioneel geverifieerd.

## Ronde 26 aug 2026 (2) — grote auditronde

- Sweep: alle 28 routes (incl. verborgen) renderen foutloos; watchdog schoon
  (enige zelftest-melding: Frame.io-keys wachten op Menno).
- Fixes: matchesTitle-woordgrens (frameio), ig-fill pakt "check IG"-
  placeholders (21 in wachtrij; levert alleen wat op als het youtube-veld
  oplosbaar is), 2 dubbele kaarten verwijderd via de app.
- Nieuw: follow-up-concepten na 7 dagen stilte (watchdog 3e, max 5/dag,
  paars blok op de kaart), einde-maand-conceptensignaal (3f, vanaf de 24e),
  bulk editor-toewijzing in de BulkBar. Alles live geverifieerd: melding
  "💸 4 conceptfacturen (€15.856)", "↻ 5 follow-ups klaargezet",
  Assign to… zichtbaar in de balk.

## Ronde 26-27 aug 2026 — swipe-menu, Finance-uitbouw, ochtendscan

- Mobiel: swipe vanaf links opent het menu, terugvegen sluit (native touch-
  listeners, passief; scroll-guard getest).
- Finance 2.0: omzet + winst centraal (delta vs vorige maand), Vooruitblik-
  kaart (6-mnd projectie: MRR + gem. los werk 3 mnd + concepten; klikbare
  maanddoelen in month_goals), Potjes (btw-kwartaal uit facturen + eigen
  percentages in agencies.reserve_config; rekentooling, geen advies),
  Uitgaven-triage (financial_mutations via Moneybird -> expense_links,
  label klant/vast/prive/overig). Migratie 036.
- Discover-ochtendscan: lib/feedscan.ts + watchdog 3g — dagelijks max 6
  video's uit volglijst (outlier >=2x mediaan / vers concept) + 2 interesse-
  onderwerpen (knowledge), Haiku-samenvatting op titel+beschrijving (geen
  transcript-kosten), notitieveld per video, Scan nu-knop + bronnen-instel-
  paneel op Discover. Migratie 037; volglijst geseed (@FilmBooth,
  @AlexHormozi) - Menno past aan via ⚙ Bronnen.
- Eerste run live: 5 outliers + 1 knowledge met NL-samenvattingen; Finance
  toont echte bankmutaties (53 te labelen) en btw-pot (€840).
- Kanalen-data die op Menno wachten: GSC (service account), YouTube
  Analytics (OAuth kanaal), Clarity (Data Export activeren), Google Ads
  (zwaar traject), LinkedIn (geen API - handmatig).

## Ronde 27 aug 2026 (2) — doel-pricing, setter, CTA

- growth.ts: doel-scenario (retainer EUR 3K + longform-upsell EUR 3.2K)
  naast huidig gemiddelde + upsell-signaal voor klanten onder doel-retainer.
- Setter: Outreach in setter-nav; scorebord op Outreach (week verstuurd
  met doel 25, replies deze week + reply-rate). Setter-login werkt via
  bestaande rol; commissiemodel nog te kiezen door Menno (call met setter).
- Migratie 038: content.cta + veld in kaart-dialoog (keyword/funnel).
- Geparkeerd op keys: Frame-video's van ready2post transcriberen (wacht op
  FRAMEIO_CLIENT_ID/SECRET; Transkriptor-key is er al) en ManyChat-koppeling
  op de setter/CTA-flows (wacht op de ManyChat External Request-stap).

## Ronde 27 aug 2026 (3) — tempo + koppel-klusjes

- Outreach-doel: 15 DM's/dag (75/week) in scorebord + growth-signalen.
- Clarity: Data Export-token "ktr-studio-dashboard" gegenereerd in Menno's
  Clarity (verklaarde de 403: er bestond nog geen token). Token staat
  eenmalig op zijn scherm; Menno plakt hem zelf in Vercel als
  CLARITY_API_TOKEN (bestaande variabele bewerken).
- Resend: domein mennokater.nl bleek al Verified; RESEND_FROM gezet op
  "KTR Studio <mail@mennokater.nl>" (alle envs; volgende deploy pakt het op).
- ManyChat: uitgelogd in Chrome — Menno moet eenmalig inloggen, daarna kan
  de External Request-stap gebouwd worden.
- Adobe/Frame.io: console bleek ingelogd met dewinterjan687@gmail.com (niet
  Menno's account) + Terms-acceptatie-dialoog namens die org. Gestopt;
  Menno moet bevestigen welk Adobe-account bij zijn Frame.io hoort.

## Ronde 27 aug 2026 (4) — ManyChat-status + taken-bewaker

- ManyChat: ingelogd, maar abonnement VERLOPEN (Free-plan, contactlimiet
  geraakt; zelfs New Automation zit achter een upgrade-paywall). External
  Request vereist Pro. Verlengen = beslissing Menno (staat als taak).
- Taken-bewaker live: zelftest-blokkades worden automatisch taken (dedupe
  14 dgn), btw-aangifte verschijnt vanzelf in jan/apr/jul/okt met deadline.
  3 concrete taken van vandaag ingeschoten (Clarity-token, ManyChat
  verlengen, Adobe/Frame.io-account).
