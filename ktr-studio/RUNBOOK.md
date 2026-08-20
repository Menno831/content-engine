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
Alles uit de AgencyBase-referentie is nu gebouwd, behalve deze twee — beide
wachten op iets buiten de code:
- **Messages (gedeelde IG-DM-inbox)** — kan niet zonder Instagram Messaging
  API (Meta-app met `instagram_manage_messages`, review vereist) of een
  ManyChat-abonnement met inbox-API. Nu al wel: leads uit ManyChat komen
  binnen via `/api/manychat`, en DM's versturen gaat handmatig vanaf Outreach.
- **Gantt-weergave** op het productieboard — tabel en kanban staan er;
  Gantt voegt weinig toe bij weekplanning en kost een externe dependency.

Wacht verder alleen nog op keys van Menno: `RESEND_API_KEY` (alle mails),
`YOUTUBE_API_KEY` (YouTube-stats en YT-competitors), en `MONEYBIRD_API_TOKEN`
netjes opnieuw zetten.

## Afgerond (18-20 aug 2026)
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
