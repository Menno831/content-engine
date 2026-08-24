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

3. **Outreach-berichten herschrijven** (na akkoord Menno over de toon): de 265
   prospects hebben nog DM's in negging-stijl; nieuwe principes staan vast
   (YouTube-first, positief, gratis waarde eerst, geen zwaktes benoemen).
   Per prospect ook de "waarom fit" vanuit hun YouTube onderbouwen.
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

Wacht verder alleen nog op keys van Menno: `ANTHROPIC_API_KEY` opnieuw zetten
(staat in Vercel maar is leeg/kapot in runtime — blokkeert AI-DM-concepten,
weekanalyse, Studio en Boost in echte modus), `RESEND_API_KEY` (alle mails),
`YOUTUBE_API_KEY` (YouTube-stats, YT-competitors én eigen-kanaal-sync),
`MONEYBIRD_API_TOKEN` netjes opnieuw zetten, en optioneel `CLARITY_API_TOKEN`
(website-bezoekers automatisch op Eigen kanalen; genereren in Clarity →
Settings → Data Export). Voor automatische eigen-kanalen-data later: GA4-API
(website) en LinkedIn heeft geen bruikbare API — dat blijft handmatig.

## Afgerond (18-24 aug 2026)
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
