#!/usr/bin/env python3
"""Bouwt de offerte voor Flaneur (founder content), in Menno's tone of voice
naar Regi. Zelfde frisse visuele stijl als de Draaivisie. Geen em dashes."""
import os
from xhtml2pdf import pisa

os.chdir(os.path.dirname(os.path.abspath(__file__)))

CSS = """
@page { size: A4; margin: 1.5cm 1.6cm; }
body { font-family: Helvetica, Arial, sans-serif; color: #1c1c1c; font-size: 10pt; }

.kick { width: 100%; border-bottom: 1.5pt solid #1c1c1c; margin-bottom: 14pt; }
.kick td { padding-bottom: 5pt; font-size: 8.5pt; letter-spacing: 2pt; font-weight: bold; }
.kick .kl { color: #F97316; }
.kick .kr { color: #9a9a9a; text-align: right; }

.h1 { font-size: 24pt; color: #0b0b0b; margin: 0 0 7pt 0; }
.lead { font-size: 10pt; color: #3a3a3a; line-height: 1.55; margin: 0 0 4pt 0; }
.lead b { color: #1c1c1c; }
.h2 { font-size: 10.5pt; color: #0b0b0b; margin: 16pt 0 7pt 0; font-weight: bold; }
.h2 .bar { color: #F97316; }

/* wat we maken: 3 kaarten */
.cards { width: 100%; }
.cards td { width: 33%; vertical-align: top; padding: 12pt 12pt; font-size: 8.6pt;
            line-height: 1.5; background-color: #fafafa; border: 0.75pt solid #ededed;
            border-top: 3pt solid #F97316; }
.cards .ch { font-size: 10pt; font-weight: bold; color: #0b0b0b; margin-bottom: 2pt; }
.cards .cn { font-size: 7pt; letter-spacing: 1pt; color: #F97316; font-weight: bold; }

/* waarde-grid 2x2 */
.vgrid { width: 100%; }
.vgrid td { width: 50%; vertical-align: top; padding: 13pt 14pt; font-size: 8.7pt;
            line-height: 1.5; background-color: #fafafa; border: 0.75pt solid #ededed;
            border-top: 3pt solid #F97316; }
.vgrid .ch { font-size: 10.5pt; font-weight: bold; color: #0b0b0b; margin-bottom: 2pt; }
.vgrid .cn { font-size: 7pt; letter-spacing: 1pt; color: #F97316; font-weight: bold; }

/* aanpak stappen */
.steps { width: 100%; }
.steps td { padding: 9pt; vertical-align: top; border-bottom: 0.75pt solid #eee; font-size: 9pt; line-height: 1.45; }
.steps .num { width: 6%; font-weight: bold; color: #fff; text-align: center; font-size: 11pt; }
.steps .st { width: 28%; font-weight: bold; color: #0b0b0b; }
.steps .sd { color: #3a3a3a; }
.s1 { background-color: #C2410C; } .s2 { background-color: #EA580C; }
.s3 { background-color: #F97316; } .s4 { background-color: #FB923C; }
.done { color: #16A34A; font-weight: bold; font-size: 8pt; }

/* deliverables */
.deliv { width: 100%; background-color: #fafafa; border: 0.75pt solid #ededed; border-left: 3pt solid #F97316; }
.deliv td { padding: 6pt 12pt; font-size: 9pt; color: #2a2a2a; border-bottom: 0.5pt solid #f0f0f0; }
.deliv .ck { color: #F97316; font-weight: bold; width: 5%; }

/* prijs kaarten (td = de hele kaart, geen geneste blokken ivm xhtml2pdf) */
.price { width: 100%; }
.price td.pc { width: 46%; vertical-align: top; padding: 16pt 16pt;
               background-color: #fafafa; border: 0.75pt solid #ededed; }
.price td.pc.reco { background-color: #0b0b0b; border: 0.75pt solid #0b0b0b; }
.price td.spacer { width: 8%; background-color: #fff; }
.tag2 { font-size: 7.5pt; letter-spacing: 1.5pt; font-weight: bold; color: #9a9a9a; }
.reco .tag2 { color: #FB923C; }
.opt { font-size: 12.5pt; font-weight: bold; color: #0b0b0b; line-height: 1.7; }
.reco .opt { color: #fff; }
.amt { font-size: 23pt; font-weight: bold; color: #F97316; line-height: 2.0; }
.per { font-size: 8.5pt; color: #9a9a9a; }
.desc { font-size: 8.3pt; color: #3a3a3a; line-height: 1.5; }
.reco .desc { color: #d0d0d0; }

.advice { background-color: #FFF4EC; border-left: 3pt solid #F97316; padding: 11pt 13pt;
          font-size: 9pt; color: #7C2D12; line-height: 1.55; margin-top: 14pt; }
.advice b { color: #7C2D12; }
.flow { background-color: #0b0b0b; color: #fff; padding: 13pt 15pt; font-size: 9.5pt;
        margin-top: 14pt; line-height: 1.55; }
.flow b { color: #FB923C; }
.foot { font-size: 7.5pt; color: #b5b5b5; letter-spacing: 0.5pt; margin-top: 10pt; }
.note { font-size: 7.5pt; color: #b5b5b5; font-style: italic; margin-top: 4pt; }
"""

PAGE1 = """
<table class="kick"><tr><td class="kl">VOORSTEL</td><td class="kr">FLANEUR FOUNDER CONTENT</td></tr></table>

<div class="h1">Laten we Flaneur founder-led maken, Regi</div>
<p class="lead">Kijk, je zei het zelf: we moeten activeren. En je hebt gelijk. Founder-led content is precies
waar het nu naartoe gaat. Kijk naar Heaton met Represent, of hoe ze het in China doen: de merken die
winnen zetten de founder vooraan en gaan snel. Niet perfect, wel echt. <b>Dit is hoe we dat voor Flaneur
neerzetten, zonder dat het jou tijd of headspace kost.</b> Jij staat voor de camera, ik regel de rest.</p>

<div class="h2"><span class="bar">|</span>&nbsp; Wat we gaan maken</div>
<table class="cards">
  <tr>
    <td>
      <div class="cn">VLAGGENSCHIP</div>
      <div class="ch">De founder-documentaire</div>
      Jouw verhuizing naar Dubai x de grootste Black Friday van Flaneur. Eén long-form video van 8 tot 14
      minuten die je persoonlijke kanaal lanceert.
    </td>
    <td>
      <div class="cn">MEER UIT ÉÉN SHOOT</div>
      <div class="ch">De cutdowns plus trailer</div>
      Uit datzelfde draaimateriaal knippen we tot 30 korte verticale video's voor je clip-accounts, plus
      een trailer voor je eigen kanaal. Eén keer draaien, maanden aan content.
    </td>
    <td>
      <div class="cn">KANT EN KLAAR</div>
      <div class="ch">Jij hoeft niks uit te zoeken</div>
      De hele voorbereiding staat al: concept, storyboard, draaivisie, shotlist. Jij hoeft alleen te draaien
      en hier en daar iets te bevestigen.
    </td>
  </tr>
</table>

<div class="h2"><span class="bar">|</span>&nbsp; Zo pakken we het aan</div>
<table class="steps">
  <tr>
    <td class="num s1">1</td>
    <td class="st">Pre-productie <span class="done">KLAAR</span></td>
    <td class="sd">Concept, narratief, storyboard, shotlist en draaivisie. Staat allemaal al, dus we kunnen meteen door.</td>
  </tr>
  <tr>
    <td class="num s2">2</td>
    <td class="st">Twee draaidagen</td>
    <td class="sd">Dubai (woning, home office, interview) en Amsterdam (kantoor in vol bedrijf). Richtlijn: eerste helft november.</td>
  </tr>
  <tr>
    <td class="num s3">3</td>
    <td class="st">Editing</td>
    <td class="sd">Long-form plus cutdowns, jouw interview als voice-over, kleurgrading en sound. Strak, niet overgeproduceerd.</td>
  </tr>
  <tr>
    <td class="num s4">4</td>
    <td class="st">Oplevering en plaatsen</td>
    <td class="sd">Thumbnail, titel en beschrijving erbij. En als je wil neem ik het posten en optimaliseren helemaal uit handen.</td>
  </tr>
</table>
<pdf:nextpage />
"""

PAGE2 = """
<table class="kick"><tr><td class="kl">VOORSTEL</td><td class="kr">WAT JE KRIJGT</td></tr></table>

<div class="h1">Alles erop en eraan</div>
<p class="lead">Geen losse onderdelen waar je zelf nog achteraan moet. <b>Eén pakket, van idee tot online.</b></p>

<table class="deliv">
  <tr><td class="ck">+</td><td>1x founder-documentaire van 8 tot 14 minuten voor YouTube</td></tr>
  <tr><td class="ck">+</td><td>Tot 30x korte verticale cutdowns voor je clip-accounts (Reels, Shorts, TikTok)</td></tr>
  <tr><td class="ck">+</td><td>1x trailer voor je eigen YouTube en Instagram, om de documentaire te pushen</td></tr>
  <tr><td class="ck">+</td><td>Thumbnail, titel en beschrijving, klaar om te plaatsen</td></tr>
  <tr><td class="ck">+</td><td>Kleurgrading en sound design over het hele geheel</td></tr>
  <tr><td class="ck">+</td><td>Volledige pre-productie (concept, storyboard, draaivisie, shotlist)</td></tr>
  <tr><td class="ck">+</td><td>Eén vaste verhaallijn zodat het altijd klopt, ook al is het niet gescript</td></tr>
  <tr><td class="ck">+</td><td>Optioneel: ik plaats en optimaliseer alles voor je, jij hoeft niks te doen</td></tr>
</table>

<div class="h2"><span class="bar">|</span>&nbsp; Planning</div>
<table class="steps">
  <tr>
    <td class="num s1">1</td>
    <td class="st">Nu</td>
    <td class="sd">Jij zegt ja en geeft feedback op de draaivisie. Wij prikken de twee draaidagen.</td>
  </tr>
  <tr>
    <td class="num s3">2</td>
    <td class="st">Eerste helft november</td>
    <td class="sd">We draaien Dubai en Amsterdam. Jij staat voor de camera, ik regel de rest.</td>
  </tr>
  <tr>
    <td class="num s4">3</td>
    <td class="st">Circa 2 weken later</td>
    <td class="sd">De documentaire en alle cutdowns zijn klaar om live te gaan, vlak voor Black Friday.</td>
  </tr>
</table>

<div class="advice"><b>Waarom nu:</b> we eindigen de video vlak voor Black Friday. De uitkomst (~€2M?) wordt
dan deel 2. Dat is precies de cliffhanger die mensen laat terugkomen. Maar dan moeten we wel op tijd draaien.</div>
<pdf:nextpage />
"""

PAGE_VALUE = """
<table class="kick"><tr><td class="kl">VOORSTEL</td><td class="kr">WAT HET JE OPLEVERT</td></tr></table>

<div class="h1">Dit is geen kostenpost, het is een asset</div>
<p class="lead">Even eerlijk over waaróm dit de moeite waard is. Dit is geen video die je maakt en weer
vergeet. <b>Het is een kanaal en een verhaal dat voor je blijft werken, ook als jij slaapt.</b></p>

<table class="vgrid">
  <tr>
    <td>
      <div class="cn">OWNED</div>
      <div class="ch">Een kanaal dat je bezit</div>
      Ads huur je, een founder-kanaal bezit je. Elke video blijft vindbaar en blijft mensen binnenhalen,
      ook over een jaar nog. Je bouwt een asset, geen advertentie die stopt zodra je niet meer betaalt.
    </td>
    <td>
      <div class="cn">DE JUISTE MENSEN</div>
      <div class="ch">Niet de meeste, wel de juiste</div>
      Dit gaat niet om views. Het gaat om de juiste mensen die Flaneur zien: talent dat bij je wil werken,
      partners die aanhaken, en klanten die je merk echt snappen. Optimaliseren voor je ICP, niet voor cijfers.
    </td>
  </tr>
  <tr>
    <td>
      <div class="cn">VERTROUWEN</div>
      <div class="ch">Een gezicht verkoopt</div>
      Mensen kopen van merken met een gezicht erachter. Jij voor de camera bouwt vertrouwen dat geen
      advertentie kan kopen. Zeker nu, in een tijd waarin alles AI en nep begint te voelen.
    </td>
    <td>
      <div class="cn">TIMING</div>
      <div class="ch">Voorsprong terwijl de rest wacht</div>
      Kijk naar China: de merken die winnen zetten de founder vooraan en gaan nu. Het Westen twijfelt en is
      te laat. Wij niet. We pakken het moment vlak voor de grootste maand van het jaar.
    </td>
  </tr>
</table>

<div class="advice"><b>De rekensom:</b> je bouwt geen losse video's, je bouwt een kanaal dat blijft
werken. Eén video die het juiste talent of de juiste partner binnenhaalt verdient zichzelf al terug.
De rest is bonus. Daarom is dit geen uitgave, maar de goedkoopste asset die je dit jaar bouwt.</div>
<pdf:nextpage />
"""

PAGE3 = """
<table class="kick"><tr><td class="kl">VOORSTEL</td><td class="kr">DE INVESTERING</td></tr></table>

<div class="h1">Twee manieren om dit te doen</div>
<p class="lead">Je kan het bij de documentaire houden, of er meteen een motor van maken die elke maand
blijft draaien. <b>Mijn eerlijke advies staat onderaan.</b></p>

<table class="price">
  <tr>
    <td class="pc">
      <span class="tag2">OPTIE 1</span><br/>
      <span class="opt">De documentaire</span><br/>
      <span class="amt">€5.000</span><br/>
      <span class="per">eenmalig, compleet</span><br/><br/>
      <span class="desc">De volledige founder-documentaire plus tot 30 cutdowns en een trailer. Twee
      draaidagen, editing, kleurgrading, thumbnail en copy. Alles erop en eraan, klaar om live te gaan.</span>
    </td>
    <td class="spacer">&nbsp;</td>
    <td class="pc reco">
      <span class="tag2">OPTIE 2 / AANRADER</span><br/>
      <span class="opt">De founder content engine</span><br/>
      <span class="amt">€3.000</span><br/>
      <span class="per">per maand, doorlopend</span><br/><br/>
      <span class="desc">De documentaire in maand 1. Daarna elke maand een nieuwe founder-video plus
      cutdowns, inclusief plaatsen en optimaliseren. We draaien in batches, dus één draaidag levert
      meerdere maanden content en het kost jou bijna geen tijd. Eén draaidag per maand inbegrepen.</span>
    </td>
  </tr>
</table>

<div class="advice"><b>Mijn advies:</b> start met de documentaire als vlaggenschip. Werkt het, en dat
denk ik echt, dan schakelen we door naar doorlopend. Eén video is een momentje. Een kanaal dat blijft
draaien is een asset. Maar we hoeven nu niks groots te beslissen, we beginnen gewoon.</div>

<div class="flow">
<b>Volgende stap:</b> zeg gewoon ja, dan prikken we de draaidagen en gaan we draaien.<br>
Geen gedoe, geen lange contracten. We activeren, precies zoals je zei.
</div>

<p class="note">Prijzen zijn exclusief btw en eventuele reiskosten naar Dubai. Geldig tot 30 dagen na dagtekening.</p>
<p class="foot">VOORSTEL / FLANEUR FOUNDER CONTENT / VOOR REGI</p>
"""

html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{PAGE1}{PAGE2}{PAGE_VALUE}{PAGE3}</body></html>"

out = "Flaneur-Offerte.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(html, dest=f)
print(f"PDF geschreven: {out}")
