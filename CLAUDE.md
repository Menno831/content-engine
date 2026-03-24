# Content Engine — Project Instructions

@AGENTS.md

## Project Overview

Dit is de website van **Content Engine** (binnenkort: **KTR Studio**) — een content agency die Reels-gebaseerde contentsystemen bouwt voor founders. De site is een single-page marketing site met een aparte booking pagina en een Reels Assessment tool.

**Live URL:** https://content-engine-nine-psi.vercel.app/
**Owner:** Menno Kater (founder)
**Taal site:** Nederlands (met zo min mogelijk Engelse termen)

## Tech Stack

- **Framework:** Next.js 16.2.1 (App Router)
- **React:** 19.2.4
- **Styling:** Tailwind CSS 4 (met `@theme inline` in globals.css)
- **Fonts:** Inter (body), Syne (display/headings), JetBrains Mono (mono/labels)
- **Smooth scroll:** Lenis
- **Deployment:** Vercel
- **TypeScript:** strict

## File Structure

```
src/app/
├── page.tsx           # Homepage (hele site in één file, "use client")
├── layout.tsx         # Root layout met fonts + metadata
├── globals.css        # CSS variabelen, Tailwind config, animaties
├── book/
│   └── page.tsx       # Booking/contact formulier pagina
├── assessment/
│   └── page.tsx       # Reels Assessment tool (interactieve quiz)
└── api/
    └── instagram/
        └── route.ts   # Instagram scraping API route (RapidAPI)
```

## Design System

### Kleuren (CSS variabelen in globals.css)
- `--background: #060606` — pagina achtergrond
- `--foreground: #F5F0EB` — primaire tekst
- `--accent: #F97316` — oranje accent (CTA's, highlights)
- `--accent-hover: #FB923C` — hover state
- `--accent-dim: rgba(249, 115, 22, 0.08)` — subtiele accent achtergrond
- `--muted: #B5ADA6` — secundaire tekst
- `--card: #0C0C0C` — kaart achtergrond
- `--card-border: #181818` — kaart borders

### Typography
- **Headings:** `font-display` class (Syne) — altijd `font-extrabold`
- **Body:** Inter (default)
- **Labels/tags:** `font-mono` class (JetBrains Mono) — uppercase, tracking-wider
- **Section labels:** oranje, uppercase, tracking-[0.15em], font-mono, met een accent-lijn ervoor

### Componenten patterns
- **Cards:** `bg-card border border-card-border rounded-2xl` (of `bg-white/[0.02] border-white/[0.06]`)
- **CTA buttons:** `bg-accent hover:bg-accent-hover text-background font-bold rounded-xl`
- **Ghost buttons:** `border border-white/[0.08] hover:border-accent/30 hover:bg-accent/[0.06]`
- **Section spacing:** `py-20 md:py-28` of `py-24 md:py-32`
- **Max width:** `max-w-7xl mx-auto px-6 md:px-12 lg:px-20`
- **Animaties:** Reveal-on-scroll via `useInView` hook + `IntersectionObserver`

## Assessment Tool (`/assessment`)

### Hoe het werkt
1. Bezoeker vult Instagram handle in
2. Handle wordt gestuurd naar `/api/instagram` voor profiel-analyse
3. 6 vragen over Reels-strategie (personal brand focus)
4. Score uit 100 + gepersonaliseerde inzichten
5. Email capture voor volledig rapport

### Instagram API Setup
De API route in `/api/instagram/route.ts` scraped Instagram via RapidAPI.

**Om live te zetten:**
1. RapidAPI account → zoek "Instagram Scraper Stable API"
2. `.env.local`:
   ```
   RAPIDAPI_KEY=jouw_api_key
   RAPIDAPI_HOST=instagram-scraper-stable-api.p.rapidapi.com
   ```
3. In `assessment/page.tsx`: zet `DEMO_MODE = false`

**In demo modus** (`DEMO_MODE = true`): de Instagram-analyse wordt overgeslagen en de score is puur op basis van de 6 vragen.

## Bekende Issues & Verbeterpunten

### BUGS (fix als eerste)
1. **`\u20AC` encoding bug op /book pagina** — Het euro-teken in het statistiek-blok wordt als raw Unicode escape weergegeven in plaats van €. Check de JSX in `book/page.tsx` — gebruik `€` of `&euro;` in plaats van de Unicode escape.
2. **Framework-kaarten onleesbaar** — De 3 funnel-kaarten (Top/Mid/Bottom Funnel) in de Framework-sectie op de homepage hebben te lage contrast. De tekst, borders en KPI-regels zijn bijna onzichtbaar op donkere achtergrond. Verhoog border opacity naar minimaal `border-white/[0.12]` en tekst naar `text-foreground/70` of hoger.
3. **Inconsistent taalgebruik** — Deze Engelse termen moeten Nederlands worden:
   - "Strategy Call" → "Strategiegesprek"
   - "Gratis Strategy Call" (navbar) → "Gratis Gesprek" (is al deels gefixed)
   - "The Content Engine Framework" → "Het Content Engine Framework" of "Het Framework"
   - "Revenue-first" → "Resultaat-gedreven"
   - "Founder-to-founder" → kan blijven als het een bewuste keuze is, maar overweeg "Founder-naar-founder"

### DESIGN
4. **Te veel lege ruimte in onderste helft homepage** — Tussen Bewezen Resultaten en de tijdlijn, tussen Framework en Hoe Het Werkt, en tussen FAQ en Waarom Wij zijn er grote lege gaten (~300px). Verklein de padding of voeg visuele elementen toe.
5. **Geen echte foto van Menno** — De "MK" initialen-cirkel is een placeholder. Voeg een echte foto toe (bijv. via `next/image` met een `public/menno.jpg`).
6. **Lage contrast body text** — Grijze body-tekst op bijna-zwarte achtergrond faalt WCAG AA. Overweeg `--muted` te verhogen naar `#C5BDB6` of lichter.
7. **Geen visuele elementen** — Nul afbeeldingen, screenshots, video's of grafieken op de hele site. Een content agency zou voorbeelden van eigen werk moeten laten zien.
8. **Tijdlijn visueel maken** — De maand 0→12 tijdlijn onder "Bewezen Resultaten" zou een visuele timeline, grafiek of progress bar moeten zijn in plaats van platte tekst.

### BOOKING PAGINA (/book)
9. **Geen Calendly/Cal.com integratie** — "We reageren binnen 24 uur" is suboptimaal voor het boeken van een call. Overweeg een Cal.com embed zodat bezoekers direct een tijdslot kiezen.
10. **Geen footer** — De /book pagina mist de footer die wel op de homepage staat.
11. **Veel lege ruimte** — Onder het formulier is een groot leeg zwart gat.
12. **Instagram handle veld toevoegen** — Nu staat er alleen Naam/Email/Bedrijf/Situatie. Voeg een `@handle` veld toe zodat Menno vooraf het profiel kan bekijken.

### ASSESSMENT PAGINA (/assessment)
13. **Email capture backend** — De email submit doet nu niks. Sluit aan op Resend, SendGrid, of een webhook naar je CRM.
14. **RapidAPI testen** — Test de `/api/instagram` route met echte accounts. Verschillende scraper APIs hebben net iets andere response structuren — pas `normalize()` aan als nodig.

## Toekomstige Rebrand: KTR Studio

Er wordt overwogen om de merknaam te wijzigen van "Content Engine" naar "KTR Studio". Als dit doorgaat:

### Wat moet veranderen
- Logo in navbar: `CONTENT<accent>ENGINE</accent>` → `KTR <dim>Studio</dim>`
- Alle verwijzingen naar "Content Engine" in copy, meta tags, footer, etc.
- Email: `hallo@contentengine.nl` → `hallo@ktrstudio.nl`
- Domein: nieuw domein `ktrstudio.nl` registreren
- OG tags en page title updaten
- Footer copyright updaten

### Branding KTR Studio
- "KTR" in bold 900 weight, "Studio" in light 300 weight
- Zelfde kleurenpalet (donker + oranje accent)
- Positionering verschuift van "contentsystemen" naar "Reels-systemen voor founders"

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Rules

- Alle tekst op de site is Nederlands
- Gebruik `font-display` (Syne) voor alle headings
- Gebruik `font-mono` voor labels en tags
- Alle CTA's linken naar `/book` of `/assessment`
- Geen externe dependencies toevoegen zonder goede reden
- Alle componenten staan inline in hun page.tsx (geen aparte components map)
- "use client" directive is verplicht voor pagina's met interactie
