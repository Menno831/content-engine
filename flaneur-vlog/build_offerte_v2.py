#!/usr/bin/env python3
"""Bouwt de Flaneur-offerte v2 (founder-doc + Made in Istanbul + engine) als
een strak HTML-document in dezelfde premium stijl als het productiepakket.
Print > Opslaan als PDF geeft een enkel PDF-bestand."""
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500&display=swap');
:root{--display:'Inter',system-ui,sans-serif;--accent:#F97316;--accent2:#C2410C;--ink:#17150f;--muted:#6f6a62;--line:#ece9e4;--bg:#fbfaf8}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:15px;-webkit-font-smoothing:antialiased}
.wrap{max-width:840px;margin:0 auto;padding:0 34px 100px}

.cover{min-height:88vh;display:flex;flex-direction:column;justify-content:center;padding:64px 0}
.cover .tag{font-family:'JetBrains Mono',monospace;letter-spacing:.34em;font-size:12px;color:var(--accent);text-transform:uppercase}
.cover h1{font-family:var(--display);font-weight:900;font-size:74px;line-height:.95;letter-spacing:-2.5px;margin:20px 0 12px;color:#100f0b}
.cover .sub{font-size:21px;color:var(--muted);font-weight:500}
.cover .rule{width:68px;height:5px;background:var(--accent);border-radius:3px;margin:36px 0}
.cover .meta{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);letter-spacing:.05em;line-height:1.9}

section.doc{padding-top:62px}
.kick{font-family:'JetBrains Mono',monospace;letter-spacing:.28em;font-size:11px;color:var(--accent);text-transform:uppercase;margin-bottom:8px}
section.doc>h1{font-family:var(--display);font-weight:800;font-size:30px;letter-spacing:-.5px;color:#100f0b;padding-top:16px;margin-bottom:16px;border-top:3px solid var(--accent);display:inline-block}
h2{font-family:var(--display);font-weight:700;font-size:19px;letter-spacing:-.2px;margin:28px 0 8px;color:#100f0b}
p{margin:10px 0}
.lead{font-size:17.5px;line-height:1.6;color:#3c3831;font-weight:500}
strong{font-weight:700;color:#100f0b}

/* kaarten: wat we maken */
.cards{display:grid;grid-template-columns:1fr;gap:14px;margin:18px 0}
.card{background:#fff;border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:12px;padding:18px 20px;box-shadow:0 1px 4px rgba(20,15,5,.05)}
.card .cn{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;color:var(--accent);text-transform:uppercase}
.card h3{font-family:var(--display);font-weight:800;font-size:17px;margin:4px 0 6px;color:#100f0b}
.card p{margin:0;font-size:14px;color:#46423b}

/* aanpak-stappen */
.step{display:flex;gap:16px;margin:14px 0;align-items:flex-start}
.step .n{flex:0 0 34px;height:34px;border-radius:10px;background:var(--accent);color:#fff;font-family:var(--display);font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center}
.step h3{font-family:var(--display);font-weight:800;font-size:15.5px;margin:0 0 3px;color:#100f0b}
.step p{margin:0;font-size:14px;color:#46423b}

/* waarde-blokken */
.vgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}
.vcard{background:#fff;border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:12px;padding:16px 18px}
.vcard h3{font-family:var(--display);font-weight:800;font-size:15.5px;margin:0 0 5px;color:#100f0b}
.vcard p{margin:0;font-size:13.5px;color:#46423b}

/* investering */
.allin{background:#fff5ec;border-left:3px solid var(--accent);padding:15px 20px;margin:18px 0;border-radius:0 10px 10px 0;color:#6b3d1f;font-size:14.5px}
.price{display:grid;grid-template-columns:1fr 1.15fr;gap:16px;margin:20px 0;align-items:stretch}
.pc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 24px}
.pc .tag2{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase}
.pc h3{font-family:var(--display);font-weight:800;font-size:19px;margin:6px 0 12px;color:#100f0b}
.pc .item{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.pc .item .amt{font-family:var(--display);font-weight:800;color:#100f0b;white-space:nowrap}
.pc .tot{display:flex;justify-content:space-between;padding:12px 0 0;font-size:14.5px;font-weight:700}
.pc.reco{background:#141310;border-color:#141310;color:#d9d4cc}
.pc.reco .tag2{color:#FB923C}
.pc.reco h3{color:#fff}
.pc.reco .big{font-family:var(--display);font-weight:900;font-size:40px;color:var(--accent);line-height:1.1}
.pc.reco .per{font-size:13px;color:#9b958c;margin-bottom:12px}
.pc.reco p{font-size:13.5px;color:#c7c1b8;margin:8px 0}
.pc.reco .addon{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #2a2823;font-size:13.5px}
.pc.reco .addon .amt{font-weight:800;color:#FB923C;white-space:nowrap}
.pc.reco .bonus{margin-top:14px;background:rgba(249,115,22,.14);border:1px solid rgba(249,115,22,.45);border-radius:10px;padding:12px 14px;font-size:13.5px;color:#f3ede4}
.pc.reco .bonus strong{color:#FB923C}
.sum{background:#fff5ec;border-left:3px solid var(--accent);padding:16px 20px;margin:20px 0;border-radius:0 10px 10px 0;color:#6b3d1f;font-size:14.5px}
.sum strong{color:#7C2D12}
.flow{background:#141310;color:#ece9e4;border-radius:14px;padding:20px 24px;margin:20px 0;font-size:15px}
.flow strong{color:#FB923C}
.fine{font-size:11.5px;color:#9b958c;line-height:1.7;margin-top:28px;font-style:italic}
.foot{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.2em;color:#b5afa6;text-transform:uppercase;margin-top:18px}

@media print{
  body{background:#fff}
  .cover{min-height:auto;padding:30px 0 56px;break-after:page}
  .cover h1{font-size:58px}
  section.doc{break-before:page;padding-top:20px}
  .pc,.card,.vcard{break-inside:avoid;box-shadow:none}
  a{color:inherit}
}
@media(max-width:680px){.cover h1{font-size:44px}.wrap{padding:0 20px 64px}.vgrid,.price{grid-template-columns:1fr}}
"""

HTML = """<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voorstel - Flaneur Founder Content</title><style>__CSS__</style></head>
<body><div class="wrap">

<div class="cover">
  <div class="tag">Voorstel &middot; Flaneur Founder Content</div>
  <h1>Laten we Flaneur founder-led maken</h1>
  <div class="sub">Twee documentaires, &eacute;&eacute;n motor erachter</div>
  <div class="rule"></div>
  <div class="meta">Voor: Regi (Flaneur)<br>Versie 2 &middot; juni 2026</div>
</div>

<section class="doc">
  <div class="kick">Sectie 1</div>
  <h1>Het plan</h1>
  <p class="lead">Kijk, je zei het zelf: we moeten activeren. En er liggen nu twee kansen tegelijk op tafel.
  E&eacute;n: je verhuist naar Dubai, precies in de aanloop naar de grootste Black Friday van Flaneur.
  Twee: we mogen filmen in de fabriek waar ook de grootste namen ter wereld gemaakt worden.
  Dat tweede gebeurt bijna nooit, en dat soort toegang krijg je geen tweede keer cadeau.</p>
  <p>Founder-led content is precies waar het naartoe gaat. Kijk naar Heaton met Represent: de merken die
  winnen zetten de founder vooraan en gaan nu. Niet perfect, wel echt. <strong>Dit is hoe we dat voor Flaneur
  neerzetten, zonder dat het jou tijd of headspace kost. Jij staat voor de camera, ik regel de rest.</strong></p>

  <h2>Wat we gaan maken</h2>
  <div class="cards">
    <div class="card">
      <div class="cn">Vlaggenschip</div>
      <h3>De founder-documentaire</h3>
      <p>Jouw verhuizing naar Dubai x de grootste Black Friday van Flaneur. E&eacute;n long-form video van 8 tot 14
      minuten die je persoonlijke kanaal lanceert. Twee draaidagen: Dubai (woning, home office, interview) en
      Amsterdam (kantoor in vol bedrijf, 30 man aan Black Friday). We eindigen vlak v&oacute;&oacute;r Black Friday.
      De uitkomst wordt deel 2, en dat is precies de cliffhanger die mensen laat terugkomen.</p>
    </div>
    <div class="card">
      <div class="cn">Het merkverhaal</div>
      <h3>Made in Istanbul</h3>
      <p>De documentaire over de fabriek waar Flaneur gemaakt wordt, dezelfde vloer als een paar van de grootste
      luxury houses. 6 tot 10 minuten, cinematisch, met respect voor het ambacht. Bijna niemand komt hier binnen
      met een camera. Deze video veroudert niet: het is positionering die je nergens kunt kopen en die jaren
      blijft werken.</p>
    </div>
    <div class="card">
      <div class="cn">Meer uit elke shoot</div>
      <h3>De cutdowns plus trailer</h3>
      <p>Uit elke draai knippen we <strong>minstens 30</strong> korte verticale video's voor je clip-accounts,
      plus een trailer voor je eigen kanaal. En kunnen we er kwalitatief meer uithalen, dan krijg je die gewoon
      van ons. E&eacute;n keer draaien, maanden aan content.</p>
    </div>
  </div>
</section>

<section class="doc">
  <div class="kick">Sectie 2</div>
  <h1>Zo pakken we het aan</h1>
  <div class="step"><div class="n">1</div><div>
    <h3>Pre-productie: staat al</h3>
    <p>Concept, narratief, storyboard, shotlists en draaivisie zijn klaar. Voor allebei de video's. Je hebt ze
    gezien, we kunnen meteen door.</p></div></div>
  <div class="step"><div class="n">2</div><div>
    <h3>Het team: twee camera's, &eacute;&eacute;n regisseur</h3>
    <p>Ik vlieg zelf mee als director. Leon, mijn vaste filmer, is de main shooter. Ik regisseer het verhaal ter
    plekke en schiet de tweede camera. Twee hoeken op elk moment, niks gemist, en ik bewaak dat elk shot het
    verhaal dient. Zo heb ik eerder de documentaires voor FunX gedraaid. Zo krijg je geen losse video, maar een
    echte film.</p></div></div>
  <div class="step"><div class="n">3</div><div>
    <h3>De draaidagen</h3>
    <p>Dubai en Amsterdam voor de founder-doc, richtlijn eerste helft november. Istanbul plannen we ruim: dag
    ervoor aankomen, &eacute;&eacute;n volle draaidag in de fabriek, dag erna terug. Geen stress, wel kwaliteit. Wij regelen
    vluchten, hotel en alles eromheen. Jij hoeft alleen maar te komen.</p></div></div>
  <div class="step"><div class="n">4</div><div>
    <h3>Editing</h3>
    <p>Long-form plus cutdowns, jouw interview als voice-over, kleurgrading en sound design over het hele geheel.
    Strak, niet overgeproduceerd. We werken net zo lang door tot het ook voor jou goed zit; voor revisies reken ik
    niks extra, we gaan gewoon voor het beste resultaat.</p></div></div>
  <div class="step"><div class="n">5</div><div>
    <h3>De push</h3>
    <p>Geen video die 200 views haalt. Voor elke video maken we drie compleet verschillende thumbnails en drie
    titels, en die A/B-testen we tot de winnaar staat. SEO, beschrijving, tags, upload en optimalisatie van de
    hoofdvideo &eacute;n alle reels: nemen wij volledig uit handen. Jij hoeft niks te doen.</p>
    <p>En we weten waar we het over hebben: met de content voor FunX hebben we samen al ruim een half miljoen
    weergaven op YouTube gehaald. Dit is precies waar we goed in zijn.</p></div></div>
</section>

<section class="doc">
  <div class="kick">Sectie 3</div>
  <h1>Wat het je oplevert</h1>
  <p class="lead">Dit is geen kostenpost, het is een asset. Even eerlijk over waarom dit de moeite waard is.</p>
  <div class="vgrid">
    <div class="vcard"><h3>Een kanaal dat je bezit</h3>
      <p>Ads huur je, een founder-kanaal bezit je. Elke video blijft vindbaar en blijft de juiste mensen
      binnenhalen, ook over een jaar nog. Je bouwt een asset, geen advertentie die stopt zodra je niet meer
      betaalt.</p></div>
    <div class="vcard"><h3>Credibility die je niet kunt kopen</h3>
      <p>"Gemaakt op dezelfde vloer als de grootste luxury houses" zegt meer dan duizend ads. Je koopt geen
      status, je laat 'm zien. En omdat bijna niemand daar mag filmen, kan niemand dit kopi&euml;ren.</p></div>
    <div class="vcard"><h3>De juiste mensen, niet de meeste</h3>
      <p>Dit gaat niet om views, het gaat om wie je aantrekt. A-players die in je geloven en met je willen bouwen,
      talent dat bij Flaneur wil werken, partners die aanhaken. We optimaliseren voor jouw mensen, niet voor
      cijfers.</p></div>
    <div class="vcard"><h3>Timing</h3>
      <p>We pakken het moment vlak voor de grootste maand van het jaar. De founder-doc eindigt op de drempel van
      Black Friday, deel 2 betaalt de cliffhanger uit. Maar dan moeten we wel op tijd draaien.</p></div>
  </div>
</section>

<section class="doc">
  <div class="kick">Sectie 4</div>
  <h1>De investering</h1>
  <div class="allin"><strong>Alle bedragen zijn all-in:</strong> vluchten, hotels, eten, lokaal vervoer, twee man
  crew, volledige edit, cutdowns, trailer en de hele push tot en met upload. E&eacute;n bedrag, geen bonnetjes
  achteraf, geen verrassingen. De prijs staat vast, ook als tickets of hotels duurder uitvallen. Dat risico is
  voor mij.</div>

  <div class="price">
    <div class="pc">
      <div class="tag2">Optie 1</div>
      <h3>Los</h3>
      <div class="item"><span>De founder-documentaire (Dubai + Amsterdam), eenmalig, compleet</span><span class="amt">&euro;10.000</span></div>
      <div class="item"><span>Made in Istanbul (de SENPA-documentaire), eenmalig, compleet</span><span class="amt">&euro;7.500</span></div>
      <div class="tot"><span>Samen los</span><span>&euro;17.500</span></div>
    </div>
    <div class="pc reco">
      <div class="tag2">Optie 2 &middot; Aanrader</div>
      <h3>De founder content engine</h3>
      <div class="big">&euro;4.000</div>
      <div class="per">per maand, minimaal 6 maanden</div>
      <p>Elke maand een volledige founder-video plus cutdowns, strategie, A/B-testen, plaatsen en optimaliseren.
      E&eacute;n draaidag in Nederland per maand inbegrepen.</p>
      <p>Wil je die maand een buitenlandproductie, dan roep je 'm gewoon af tegen een vaste meerprijs die de hele
      trip dekt. Ook dan alles inbegrepen: twee man, vluchten, hotel, de hele productie. De buitenlandproductie
      vervangt die maand de Nederlandse draaidag.</p>
      <div class="addon"><span>Dubai-productie, afroep</span><span class="amt">+ &euro;5.000</span></div>
      <div class="addon"><span>Istanbul-productie, afroep</span><span class="amt">+ &euro;3.000</span></div>
      <div class="bonus"><strong>En kies je hiervoor, dan strepen we je openstaande factuur weg.</strong> Schone lei, we beginnen vooruit.</div>
    </div>
  </div>

  <div class="sum"><strong>De rekensom, even simpel:</strong> los zijn twee video's &euro;17.500. In de engine
  krijg je over zes maanden zes volledige video's (inclusief b&eacute;ide documentaires) plus minimaal 180
  kwalitatieve verticale clips, en meer als er meer uit te halen valt, voor &euro;32.000. Per video reken je dan
  ruim &euro;5.300 in plaats van &euro;8.750, terwijl wij &aacute;lles overnemen: van strategie tot en met
  upload.</div>

  <p><strong>Mijn advies:</strong> wil je het klein houden, begin dan los met de founder-documentaire, geen
  verplichting. Maar de engine is waar het echt gebeurt. Van nu tot Black Friday is precies de aanloop waarin een
  founder-kanaal momentum opbouwt, en met de fabriekstoegang die nu openligt wil je niet wachten. Daarom die zes
  maanden: zo word ik je vaste contentteam en bouwen we iets dat blijft staan.</p>
  <div class="flow"><strong>Volgende stap:</strong> laat me weten welke kant je op wil, dan prikken we meteen de
  draaidagen. Istanbul kan al snel, Dubai zetten we vast voor de eerste helft van november. Dan zijn we ruim op
  tijd voor Black Friday.</div>

  <p class="fine">Prijzen exclusief btw. Alle reis- en verblijfkosten van het tweekoppige team zijn inbegrepen in
  de genoemde bedragen; prijzen zijn vast en worden niet achteraf verrekend. Betaling losse producties: 50% bij
  akkoord, 50% v&oacute;&oacute;r de eerste draaidag. Engine: maandelijks vooraf gefactureerd, minimale looptijd zes
  maanden. Voor revisies rekenen we niks extra; we werken door tot het zit, met een ruime limiet van vijf rondes
  per hoofdvideo. Dronebeelden in de fabriek in Istanbul kunnen
  wettelijk alleen via een lokaal gelicentieerde operator en zijn optioneel bij te boeken voor &euro;750.
  Voorstel geldig tot 30 dagen na dagtekening.</p>
  <p class="foot">Voorstel / Flaneur Founder Content / Voor Regi</p>
</section>

</div></body></html>"""

html = HTML.replace("__CSS__", CSS)
with open("Flaneur-Offerte.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: Flaneur-Offerte.html")
