# Startprompt KTR Studio-sessies

Kopieer alles onder de streep in een nieuwe Claude Code-sessie (web of lokaal) om aan het platform door te bouwen. Voor een nieuwe sprint pas je alleen het blok "DEZE SPRINT" aan.

> De volledige architectuur, regels en functionele kaart staan in `ktr-studio/CLAUDE.md` — die leest Claude Code automatisch. Deze startprompt hoeft dus alleen de sprint-opdracht en de afspraken te bevatten.

---

Je werkt aan **KTR Studio**, het agency-platform in de map `ktr-studio/` van repo `Menno831/content-engine`. Lees eerst `ktr-studio/CLAUDE.md` volledig — daar staan de architectuurregels, de functionele kaart en de database-werkwijze.

**Belangrijkste afspraken (naast CLAUDE.md):**
- Doe altijd eerst `git pull`. Werk op een **eigen feature-branch**; de branch `claude/website-scrape-recreate-hsgFv` is de productie-branch (elke push daarheen staat direct live). Mergen dáárheen alleen met akkoord van Menno.
- Na elke stap: `npm run build` (in `ktr-studio/`) groen, dan pas committen.
- Geen keys/secrets in code, commits of chat. Nieuwe env-variabelen: lege placeholder in `.env.example` + melden welke variabele Menno in Vercel/`.env.local` moet zetten.
- Database-wijzigingen: nieuw bestand in `src/db/migrations/` én bijwerken in `setup.sql` (verse database) en `migrate.sql` (bestaande database, additief). Meld dat Menno de migratie in Supabase moet draaien.
- Rapporteer aan het eind: wat af is, hoe Menno het test, welke env-variabelen/migraties nodig zijn, en wat je bewust hebt laten liggen.

**DEZE SPRINT (sprint 2 — voorstel, pas aan naar behoefte):**

1. **Rapportage-mail:** de "Verstuur nu"-knop op Rapporten echt laten werken via Resend (`RESEND_API_KEY`): het maandrapport van een klant als nette HTML-mail naar diens `contact_email`. Plus een maandelijkse cron die dit automatisch doet voor klanten waar het aanstaat.
2. **Koppelingen-scherm:** één instellingenpagina die per integratie (Instagram, YouTube, Transkriptor, Higgsfield, ManyChat, Resend) toont of de key staat en de laatste sync/fout — zodat status niet meer verspreid staat.
3. **Kleine afmaakpunten:** YouTube-voorbeelddata in demo-modus (`data.ts`-patroon), en Boost-resultaten met één klik naar het productieboard kunnen sturen (zoals de Studio al kan).

**Buiten scope deze sprint:** outreach-motor, white-label domeinen, productie-deploy zonder akkoord.
