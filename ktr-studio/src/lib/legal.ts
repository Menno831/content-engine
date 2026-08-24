// ════════════════════════════════════════════════════════════════
// Documentsjablonen: NDA voor editors en samenwerkingsovereenkomst
// voor klanten. Nederlands, praktisch en redelijk — bedoeld als
// werkbare standaard, geen vervanging van juridisch advies.
// De teksten zijn vóór het aanmaken nog volledig te bewerken.
// ════════════════════════════════════════════════════════════════

const nlDate = (d = new Date()) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export interface NdaFields {
  editorNaam: string;
  editorEmail?: string;
  startdatum?: string; // ISO
}

export function buildEditorNda(f: NdaFields): { title: string; body: string } {
  const start = f.startdatum ? nlDate(new Date(f.startdatum)) : nlDate();
  return {
    title: `Geheimhoudingsverklaring — ${f.editorNaam}`,
    body: `GEHEIMHOUDINGSVERKLARING (NDA)

Tussen:
1. Menno Kater, handelend onder de naam KTR Studio (hierna: "Opdrachtgever")
2. ${f.editorNaam}${f.editorEmail ? ` (${f.editorEmail})` : ""} (hierna: "Editor")

Datum: ${start}

1. ACHTERGROND
De Editor verricht videobewerkings- en contentwerkzaamheden voor Opdrachtgever en krijgt daarbij toegang tot vertrouwelijke informatie: ruw beeldmateriaal, klantgegevens, strategieën, scripts, cijfers, inloggegevens en werkwijzen.

2. GEHEIMHOUDING
De Editor houdt alle vertrouwelijke informatie strikt geheim en deelt deze niet met derden. Dit geldt tijdens de samenwerking en tot twee (2) jaar na afloop ervan. Vertrouwelijke informatie wordt uitsluitend gebruikt voor het uitvoeren van de opdrachten.

3. MATERIAAL EN TOEGANG
Alle bestanden, inloggegevens en systemen die Opdrachtgever ter beschikking stelt blijven eigendom van Opdrachtgever of diens klanten. Bij het einde van de samenwerking verwijdert de Editor lokale kopieën en levert toegang in.

4. RECHTEN OP HET WERK
Alle rechten op het bewerkte materiaal (inclusief tussenversies en projectbestanden) komen toe aan Opdrachtgever vanaf het moment van betaling van de betreffende opdracht. De Editor mag afgerond werk alleen in een eigen portfolio tonen na schriftelijke toestemming van Opdrachtgever.

5. GEEN DIRECTE BENADERING
De Editor benadert klanten van Opdrachtgever niet rechtstreeks voor eigen opdrachten, tijdens de samenwerking en tot twaalf (12) maanden na afloop ervan.

6. GEVOLGEN VAN OVERTREDING
Bij overtreding van deze verklaring is de Editor aansprakelijk voor de daardoor geleden schade. Partijen kunnen daarnaast in redelijkheid een vergoeding overeenkomen per overtreding.

7. TOEPASSELIJK RECHT
Op deze verklaring is Nederlands recht van toepassing.

ONDERTEKENING
Namens KTR Studio: Menno Kater
Editor: (digitale ondertekening via deze pagina, met naam en tijdstempel)`,
  };
}

export interface AgreementFields {
  klantNaam: string;
  bedrijf?: string;
  pakket: string; // bv. "8 video's per maand"
  maandbedrag: number;
  startdatum?: string; // ISO
  opzegtermijnMaanden?: number;
}

export function buildClientAgreement(f: AgreementFields): { title: string; body: string } {
  const start = f.startdatum ? nlDate(new Date(f.startdatum)) : nlDate();
  const opzeg = f.opzegtermijnMaanden ?? 1;
  const partij = f.bedrijf ? `${f.bedrijf}, vertegenwoordigd door ${f.klantNaam}` : f.klantNaam;
  return {
    title: `Samenwerkingsovereenkomst — ${f.bedrijf || f.klantNaam}`,
    body: `SAMENWERKINGSOVEREENKOMST CONTENTPRODUCTIE

Tussen:
1. Menno Kater, handelend onder de naam KTR Studio (hierna: "KTR Studio")
2. ${partij} (hierna: "Klant")

Ingangsdatum: ${start}

1. DE DIENST
KTR Studio verzorgt voor de Klant contentproductie volgens het afgesproken pakket: ${f.pakket}. Onder de dienst vallen de afgesproken videobewerking, publicatieklaar aanleveren en afstemming over de planning.

2. VERGOEDING EN BETALING
De maandelijkse vergoeding bedraagt € ${f.maandbedrag.toLocaleString("nl-NL")} exclusief btw, maandelijks vooraf gefactureerd. Betalingstermijn: 14 dagen na factuurdatum. Bij te late betaling kan KTR Studio de werkzaamheden opschorten tot de betaling binnen is.

3. AANLEVERING EN MEDEWERKING
De Klant levert tijdig het benodigde ruwe materiaal en de benodigde input aan. Vertraging in aanlevering door de Klant schuift de planning op maar geeft geen recht op vermindering van de vergoeding.

4. REVISIES
Per video zijn twee (2) revisierondes inbegrepen. Extra revisies of werk buiten het pakket worden vooraf besproken en apart geoffreerd.

5. RECHTEN OP DE CONTENT
Na betaling krijgt de Klant het volledige gebruiksrecht op de opgeleverde eindproducten. KTR Studio mag opgeleverd werk tonen als referentie (portfolio, site, socials), tenzij de Klant daar schriftelijk bezwaar tegen maakt.

6. DUUR EN OPZEGGING
De samenwerking geldt per maand en wordt stilzwijgend verlengd. Opzeggen kan schriftelijk met een opzegtermijn van ${opzeg} maand${opzeg === 1 ? "" : "en"}, tegen het einde van een kalendermaand.

7. GEEN RESULTAATGARANTIE
KTR Studio spant zich maximaal in voor kwaliteit en groei, maar geeft geen garantie op specifieke views, volgers of omzet: platformen en algoritmes vallen buiten ieders controle.

8. AANSPRAKELIJKHEID
De aansprakelijkheid van KTR Studio is beperkt tot maximaal één maandvergoeding. KTR Studio is niet aansprakelijk voor indirecte schade of voor content die de Klant zelf aanlevert of publiceert.

9. VERTROUWELIJKHEID
Beide partijen gaan vertrouwelijk om met elkaars bedrijfsinformatie en cijfers.

10. TOEPASSELIJK RECHT
Op deze overeenkomst is Nederlands recht van toepassing.

ONDERTEKENING
Namens KTR Studio: Menno Kater
Klant: (digitale ondertekening via deze pagina, met naam en tijdstempel)`,
  };
}
