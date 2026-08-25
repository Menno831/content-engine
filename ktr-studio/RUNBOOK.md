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
