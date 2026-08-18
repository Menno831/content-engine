# RUNBOOK — openstaande uitvoer-acties

Voor een Claude Code-sessie **met netwerktoegang** (zie CLAUDE.md voor context).
Doel: alles hieronder zelf uitvoeren, zonder dat Menno hoeft te plakken.

## Benodigde omgeving
Environment-variabelen (via de environment-instellingen, nooit in chat/commits):
- `SUPABASE_ACCESS_TOKEN` — personal access token (supabase.com/dashboard/account/tokens); hiermee kan SQL via de Management API: `POST https://api.supabase.com/v1/projects/{ref}/database/query` met body `{"query":"..."}`
- `SUPABASE_PROJECT_REF` — het project-ref (staat in de Supabase-URL)
- `VERCEL_TOKEN` — vercel.com/account/tokens; voor env-vars zetten + redeploy via de Vercel API

## Openstaande acties (aug 2026)
1. **Outreach-import**: lees Monday-borden `5093460835` (Audit Pipeline – Outreach)
   en `5099593473` (IG Outreach — DM Wachtrij) via de Monday-MCP-connector.
   Genereer inserts naar `prospects` (kolommen: name, instagram, youtube, weakness,
   stage, potential_value, note, message, external_id='monday-audit:<id>' /
   'monday-dm:<id>'), agency = `select agency_id from profiles where role='owner' limit 1`.
   Statusmap DM-bord: Nieuw→te_contacteren, Verstuurd→dm_verstuurd, Reply→in_gesprek,
   Call geboekt→audit_verstuurd, Geen fit→geen_reactie. Idempotent op external_id.
   ⚠️ Deze data is privé — nooit in de (publieke) repo committen; direct DB in.
2. **Spook-agency opruimen**:
   `delete from agencies where id not in (select agency_id from profiles) and id not in (select agency_id from clients);`
3. **Controle migraties**: `src/db/migrate.sql` is additief/idempotent — draai 'm
   integraal via de Management API zodat 010–022 gegarandeerd staan.
4. **Vercel-envs controleren/zetten** (project content-engine, root `ktr-studio`):
   RESEND_API_KEY, ASANA_TOKEN, MONEYBIRD_API_TOKEN, MONEYBIRD_ADMINISTRATION_ID,
   YOUTUBE_API_KEY — waarden vraag je aan Menno of staan al in Vercel (Sensitive
   envs tonen leeg maar zijn opgeslagen). Daarna redeploy zonder build-cache.
5. **Moneybird-check**: open Finance op de live site en controleer of het
   facturenblok data toont; zo niet, lees de foutmelding en fix.
6. **mennokater.nl-content**: scripts/lijsten staan in repo `Menno831/menno-landing`
   (privé). Als die repo aan de sessie is toegevoegd: zet de scripts over naar de
   `scripts`-tabel (title/content/status/tag), idempotent.

## Afvinken
Werk deze lijst bij (verwijder afgeronde punten) en commit, zodat de volgende
sessie niet dubbel werk doet.
