# BACKLOG — kleine verbeteringen (zelfwerk-lijst)

Eén item per iteratie: bouwen → `npm run build` groen → pushen → item afvinken
(✅ + datum laten staan, niet verwijderen). Alleen code-werk; alles wat database-
of netwerktoegang vraagt hoort in RUNBOOK.md, niet hier.

1. ✅ (18 aug) Productieboord: Posted-rij standaard inklappen tot de 12 nieuwste
   (met "Show all"-schakel) — anders wordt het bord eindeloos na de imports.
2. ✅ (18 aug) Klantenoverzicht: video's/mnd + video-mix op de klantkaarten;
   de "omzet €"-tegel (lead-attributie) is daarbij vervallen — omzet is weg
   uit de UI zolang er geen echte attributie is.
3. ✅ (18 aug) Dashboard "Vandaag"-rij: vijfde tegel "Outreach te contacteren"
   (head-count, linkt naar /platform/outreach).
4. Kalender: controleren dat kaarten met posting_date goed verschijnen en
   klikken → bewerkdialoog (zelfde als op het bord).
5. Settings: koppelingen-status tonen — per integratie (Resend, RapidAPI,
   YouTube, Moneybird, Asana, Anthropic) alleen "ingesteld / ontbreekt"
   (boolean op de server, nooit de waarde zelf).
6. Approvals: lege staten + klantrol nalopen; teksten kloppend maken.
7. Team-pagina: bestaande logins tonen (naam, rol, e-mail) zodat je ziet wie
   er al toegang heeft.
8. Editors-pagina: pay-per-video en on-time/te-laat statistiek nalopen tegen de
   nieuwe delivered_at-flow.
9. Mobiel: bewerkdialoog en board-grid op klein scherm nalopen (overflow,
   knopgroottes).
10. Reports: lege staten wanneer er nog geen metrics zijn; geen verzonnen data.
