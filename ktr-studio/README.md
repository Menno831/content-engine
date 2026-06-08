# KTR Studio — Platform

All-in-one platform voor content agencies: content-pipeline, leads, omzet en
rapportage per klant. Losse Next.js-app (later te deployen op `app.ktrstudio.nl`).

Kernregel: **echte data of niets.** Elke metric draagt een bron + tijdstempel.
Zolang er niks gekoppeld is, staat er een zichtbare demo-databanner — nooit
stiekem nepcijfers.

## Lokaal draaien

```bash
cd ktr-studio
npm install
cp .env.example .env.local   # daarna invullen (zie hieronder)
npm run dev                  # http://localhost:3001
```

In demo-modus (standaard) zie je het hele platform met voorbeelddata.

## Activeren (van demo → echt)

### 1. Supabase (database + auth)
1. Maak een project op [supabase.com](https://supabase.com).
2. **SQL Editor** → plak de inhoud van `src/db/schema.sql` → run (verse install,
   bevat alle tabellen). Heb je al een ouder project? Draai dan de migraties in
   `src/db/migrations/` op volgorde (`001` → `007`); draai `004` los (enum-wijziging).
3. **Settings → API** → zet in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
4. Zet `NEXT_PUBLIC_DEMO_MODE=false`.

Nu werkt registreren/inloggen; bij signup wordt automatisch je agency aangemaakt.

### 2. Instagram — kies een bron
- **Scrape (snel, test):** RapidAPI-account → abonneer op de Instagram-scraper →
  `RAPIDAPI_KEY` invullen. Werkt op basis van de `ig_handle` van een klant.
- **Officieel (betrouwbaar, productie):** Meta-app op
  [developers.facebook.com](https://developers.facebook.com) (type *Business*) +
  Instagram Graph API. Vul `META_APP_ID`, `META_APP_SECRET`,
  `META_GRAPH_REDIRECT_URI` in. IG-account moet Business/Creator zijn en aan een
  Facebook-pagina gekoppeld. Verbinden via de Klanten-pagina (OAuth).

### 3. Testen
1. Log in → **Klanten** → *Klant toevoegen* (met `@handle`).
2. Klik **Sync** op de klantkaart → data stroomt naar `content` +
   `content_metrics`.
3. Dashboard/Analytics tonen nu echte cijfers; niet-gekoppelde bronnen tonen
   "niet verbonden".

## Architectuur (kort)

```
Instagram (scrape | Graph API)
  → /api/sync/instagram (handmatig)  ·  /api/cron/sync-instagram (nachtelijks)
     → content + content_metrics (bron + fetched_at)
        → src/lib/data.ts → dashboard / analytics / pipeline / clients
```

- `src/lib/config.ts` — demo-schakelaar + per-bron config-checks
- `src/lib/data.ts` — demo-of-echt datalaag
- `src/lib/integrations/` — instagram (scrape) + instagram-graph (officieel)
- `src/lib/sync/` — schrijft opgehaalde data naar de database
- `src/lib/supabase/` — server/browser/admin clients + middleware
- `vercel.json` — nachtelijke cron (03:00) → vereist `CRON_SECRET`

## Status

Klaar: auth, multi-tenant schema (RLS), IG-scrape + officiële koppeling,
sync → database, datalaag, alle schermen, klant-aanmaak + sync-knop, auto-sync.

Volgende kandidaten: YouTube- en ManyChat-bronnen, koppelingen-instellingenscherm,
white-label client-portaal, automatische rapportage (Resend).
