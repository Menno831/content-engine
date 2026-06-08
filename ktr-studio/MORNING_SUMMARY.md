# Goedemorgen Menno — wat er vannacht gebouwd is

Een nachtje doorgebouwd aan **KTR Studio**, het all-in-one agency-OS. Hieronder
in het kort: wat er staat, hoe je het bekijkt, wat al echt werkt, en wat ik nog
van jou nodig heb. Geef morgen gewoon feedback — alles is reversibel.

## 👀 Eerst bekijken (geen login nodig)

De **showroom** staat publiek met demo-data, zonder login:

```
content-engine-kr5c.vercel.app
```

Klik door de hele linkerbalk. Bovenaan staat een gele "demo-data"-banner — alle
cijfers daar zijn voorbeelden. Wil je terug naar de echte stand (met login +
jouw data)? Zet in Vercel `NEXT_PUBLIC_DEMO_MODE` op `false` → Redeploy.

> Tip: zet de showroom even op `false` en log in om de **rol-views** te zien
> (klantportaal, editor, setter) — die zien er anders uit dan de agency-view.

## 🧩 Wat er nu in zit (per menu-item)

| Onderdeel | Wat het doet | Status |
|---|---|---|
| **Dashboard** | Agency-overzicht: omzet, klanten, leads, maanddoel, pipeline-status. Klant-login krijgt z'n eigen overzicht. | ✅ UI + data-laag |
| **Content pipeline** | Jullie echte 8-fase Monday-workflow (Ideation → … → Posted). Kaarten toevoegen + verslepen tussen fases. | ✅ + bewerkbaar |
| **Kalender** | Maandkalender van alle content, gekleurd per fase, met maand-navigatie. | ✅ |
| **Approvals** | Klant keurt content goed of vraagt revisie; jij ziet wie waarop wacht. | ✅ |
| **Studio (AI)** | Hook- & scriptgenerator (mock; klaar voor Claude API). | ✅ UI |
| **AI Visuals** | Higgsfield Soul: kies klant → character + brand-prompt staan klaar → prompt → mock beeld/video. | ✅ UI, koppeling open |
| **Brand Studio** | Plak tekst → gebrande carrousel-slides → exporteer als PDF. | ✅ |
| **Leads & Omzet** | CRM/sales-pijplijn. Leads toevoegen + fases; closed → omzet-attributie. | ✅ |
| **Outreach** | Acquisitie-board (nieuwe klanten werven): te contacteren → audit verstuurd. | ✅ |
| **Analytics** | Content-performance, beste reels (klikbaar), omzet per klant. | ✅ |
| **Finance** | Winst per klant/pakket, retainer vs editor-kosten, marge, betaalstatus. | ✅ |
| **Editors** | Uitbetalingen per editor + **10% deductie per te late video**. | ✅ |
| **Taken** | Content-to-do's per klant; klant vinkt af + krijgt melding/e-mail. | ✅ |
| **Rapporten** | Auto white-label maandrapport (preview). | ✅ UI |
| **Klanten** | White-label beheer, IG-sync, portaal-login aanmaken per klant. | ✅ |
| **Team** | Logins voor team met rol (team/editor/setter). | ✅ |
| **Instellingen** | Merknaam + accentkleur (hertint hele platform) + maanddoel. | ✅ |
| **Meldingen (bel)** | Ongelezen-indicator + meldingen-paneel; e-mail via Resend. | ✅ |

**Rollen** die ingebouwd zijn (eigen login + eigen view):
- **Owner/Team** — alles.
- **Klant** — eigen portaal: alleen z'n content, prestaties, taken, goedkeuringen, rapporten.
- **Editor** (bv. Jesse) — productieboard + taken.
- **Setter** (bv. Nienke) — CRM/leads (voedt automatisch jouw omzet-dashboard).

## ✅ Wat al écht werkt (geen mock)

- Auth + registratie (auto-bevestigd, geen mail nodig), multi-tenant met
  row-level-security (iedereen ziet alleen eigen data).
- Klant aanmaken, klant-/team-logins aanmaken, leads/prospects/taken/editors
  beheren, fases verslepen — alles schrijft naar je echte database (zodra
  `DEMO_MODE=false`).
- Instagram-sync (scrape + officiële Graph API) → content + metrics.
- White-label accentkleur door het hele platform.

## 🔌 Wat nog "schil" is (UI klaar, integratie open)

- **Studio / AI scripts** → wachten op Claude API-koppeling.
- **AI Visuals** → wachten op Higgsfield-MCP/API (`HIGGSFIELD_API_KEY`).
- **Brand Studio AI-herschrijven** → nu pure templating; AI-merkstem volgt.
- **ManyChat** → leads kun je nu handmatig invoeren; auto-instroom volgt.
- **E-mail (Resend)** → werkt zodra `RESEND_API_KEY` gezet is.

## 🗄️ Wat ik van jou nodig heb (zodra je echte data wil)

1. **Database-migraties draaien** — in de Supabase SQL Editor, op volgorde:
   `001` → `002` → `003` → `004` → `005` → `006` → `007`
   (staan in `ktr-studio/src/db/migrations/`). `004` draai je los (enum-wijziging).
2. **Env-vars** (Vercel → Settings → Environment Variables), naar behoefte:
   - `RAPIDAPI_KEY` → Instagram-data ophalen
   - `RESEND_API_KEY` → e-mails versturen
   - `HIGGSFIELD_API_KEY` → AI Visuals echt genereren
   - (later) Claude API, ManyChat, Meta Graph
3. **`NEXT_PUBLIC_DEMO_MODE=false`** zetten om van showroom → echte app te gaan.

## 💬 Waar ik graag feedback op wil

- Klopt de **8-fase pipeline** met hoe jullie écht werken?
- Mis je menu-items of features? (Bv. assets/bestanden, SOP's, urenregistratie.)
- Welke integratie als eerste echt aansluiten: **Instagram-data**,
  **AI Visuals (Higgsfield)** of **AI scripts (Claude)**?

Alles staat op branch `claude/website-scrape-recreate-hsgFv` (PR #1) — elke
commit is een los, terugdraaibaar stuk. Tot morgen! 🚀
