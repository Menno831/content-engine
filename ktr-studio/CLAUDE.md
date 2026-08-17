# KTR Studio — Project Instructions

Dit is het **KTR Studio dashboard**: een all-in-one agency OS voor een Reels-content-agency (klanten, content-pipeline, CRM, AI-studio, rapportage). Losse Next.js-app in `/ktr-studio` binnen de content-engine repo (de repo-root bevat de oude marketingsite — daar werken we niet meer aan).

**Live:** https://content-engine-kr5c.vercel.app/platform
**Vercel production branch:** `claude/website-scrape-recreate-hsgFv` — elke push deployt direct live. Werk bij twijfel op een feature-branch en merge pas na een groene build.

## Tech stack

- Next.js 16.2.1 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind CSS 4 (`@theme inline` in `globals.css`)
- Supabase (`@supabase/ssr`) — multi-tenant met Row-Level Security
- Claude API (`@anthropic-ai/sdk`) — Opus 4.8 ("smart") + Haiku 4.5 ("fast")
- Fonts: Inter (body + headings), JetBrains Mono (labels)

## Commands

```bash
cd ktr-studio
npm run dev      # dev server
npm run build    # ALTIJD draaien vóór commit — moet groen zijn
npm run lint
```

## Architectuur — de belangrijkste regels

1. **"Echte data of niets."** Geen verzonnen cijfers in echte modus. `DEMO_MODE` (env `NEXT_PUBLIC_DEMO_MODE !== "false"`) toont demo-data; echte modus toont echte queries of nette lege staten. De keuze zit in **`src/lib/data.ts`** — álle pagina-data loopt daar doorheen.
2. **Multi-tenant + RLS.** agencies → clients → content → metrics → leads. Elke tabel heeft RLS-policies op `current_agency_id()` / `current_client_id()` (security definer, zie `src/db/schema.sql`). Server actions checken auth; de database dwingt tenant-isolatie af.
3. **Rollen:** owner/team (alles), client (alleen-lezen portaal, eigen data), editor (productieboard), setter (CRM). Navigatie per rol in `src/app/platform/Shell.tsx`.
4. **Metrics dragen altijd bron + tijdstempel** (`content_metrics.source` + `fetched_at`). Snapshots, geen overschrijvingen.
5. **AI:** `src/lib/ai.ts` — `generateText({template, input, model})` met `model: "smart"` (Opus 4.8, brand voice/briefs) of `"fast"` (Haiku, hooks/scripts/boosts). Mock-fallback zonder key. Route `/api/ai/generate` injecteert automatisch brand voice van de klant (`client_id`) en optioneel second brain (`use_brain`).
6. **Componenten** staan per route-map (`AddClientDialog.tsx` naast `page.tsx`), gedeelde UI in `src/app/platform/_components.tsx`, demo-data + types in `_data.ts`.
7. **Alle teksten Nederlands**, foutmeldingen in mensentaal.

## Database

- **Schema:** `src/db/schema.sql` + migraties `src/db/migrations/001-015`
- **Nieuwe lege database:** plak `src/db/setup.sql` in de Supabase SQL Editor (⚠️ dropt alles eerst)
- **Bestaande database bijwerken:** plak `src/db/migrate.sql` (veilig, puur additief, idempotent)
- **Nieuwe migratie maken?** Los bestand `migrations/0XX_naam.sql` + toevoegen aan `setup.sql` én `migrate.sql`. Altijd `if not exists` / `drop policy if exists` gebruiken.

## Env-keys (zie `.env.example` voor alles)

| Key | Waarvoor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | database |
| `NEXT_PUBLIC_DEMO_MODE=false` | echte data |
| `ANTHROPIC_API_KEY` | alle AI (brief, studio, boost, brand voice) |
| `RAPIDAPI_KEY` + `RAPIDAPI_HOST=instagram120.p.rapidapi.com` | Instagram-sync |
| `HIGGSFIELD_API_KEY` (`KEY_ID:KEY_SECRET`) | thumbnails |
| `TRANSKRIPTOR_API_KEY` | audio/video → transcript |
| `MANYCHAT_WEBHOOK_SECRET`, `CRON_SECRET`, `YOUTUBE_API_KEY`, `RESEND_API_KEY` | webhook/cron/yt/mail |
| `MONEYBIRD_API_TOKEN` + `MONEYBIRD_ADMINISTRATION_ID` | facturen op Finance (alleen-lezen) |
| `ASANA_TOKEN` | twee-weg-sync met Asana-borden (asana_project_id per klant) |

Vraag de echte waarden aan Menno (nooit committen; `.env.local` is gitignored).

## Functionele kaart (waar zit wat)

- **Dashboard** `platform/page.tsx` — commandopost ("Vandaag"-rij) + KPI's + brief-teaser
- **Daily Brief** `platform/brief` + `lib/brief.ts` + cron `/api/cron/daily-brief` — dagelijkse ideeën per klant
- **Studio** `platform/studio` — transcript/onderwerp → ideeën → killer scripts → knop naar productieboard
- **Boost** `platform/boost` — één idee → Reel/carrousel/story/LinkedIn/thread/YouTube/e-mail
- **Klanten** `platform/clients` — profiel met brand-context (identity/story/strategy/**voice**), intake-wizard + publieke intake-link (`/intake/[token]`), transcripten (Transkriptor), opdrachten per factuurmaand, brand-kleuren
- **Pipeline** `platform/pipeline` — 8 fases voor team; vereenvoudigd alleen-lezen board voor klant-logins
- **Discover** `platform/discover` — competitors volgen, outlier-detectie (≥2x mediaan)
- **Leads** `platform/leads` — CRM + follow-up-datums per setter; ManyChat-webhook `/api/manychat`
- **Sync** `lib/sync/*` — Instagram (scrape/Graph) + YouTube + competitors; cron `/api/cron/sync-instagram`
- **Second brain** `platform/boards` — kennisbank, voedt AI via `use_brain`
- **AI Visuals** `platform/visuals` + `lib/higgsfield.ts` — thumbnails met vast Soul-character per klant
- **Brand Studio** `platform/brand-studio` — carousels/stories met foto-drop, canvas-PNG-export

## Werkwijze

- Build moet groen zijn vóór elke commit (`npm run build` in `ktr-studio/`)
- Geen nieuwe dependencies zonder goede reden
- Bij DB-wijzigingen: migratie meesturen én melden dat die in Supabase gedraaid moet worden
