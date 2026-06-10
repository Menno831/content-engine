#!/usr/bin/env python3
"""Bouwt de Draaivisie: een korte, visuele alignment-doc voor Regi.
Geschreven vanuit Menno's tone of voice, direct naar Regi. Geen em dashes."""
import os
from xhtml2pdf import pisa

os.chdir(os.path.dirname(os.path.abspath(__file__)))

CSS = """
@page { size: A4; margin: 1.5cm 1.6cm; }
body { font-family: Helvetica, Arial, sans-serif; color: #1c1c1c; font-size: 10pt; }

/* kicker / header band */
.kick { width: 100%; border-bottom: 1.5pt solid #1c1c1c; margin-bottom: 14pt; }
.kick td { padding-bottom: 5pt; font-size: 8.5pt; letter-spacing: 2pt; font-weight: bold; }
.kick .kl { color: #F97316; }
.kick .kr { color: #9a9a9a; text-align: right; }

.h1 { font-size: 25pt; color: #0b0b0b; margin: 0 0 7pt 0; }
.lead { font-size: 10pt; color: #3a3a3a; line-height: 1.55; margin: 0 0 4pt 0; }
.lead b { color: #1c1c1c; }
.h2 { font-size: 10.5pt; color: #0b0b0b; margin: 16pt 0 7pt 0; font-weight: bold; }
.h2 .bar { color: #F97316; }

/* look in 3 woorden */
.look { width: 100%; }
.look td { text-align: center; vertical-align: middle; color: #fff; padding: 13pt 7pt;
           border: 2pt solid #fff; line-height: 1.4; width: 33%; }
.look .w { font-size: 15pt; font-weight: bold; letter-spacing: 1pt; }
.look .s { font-size: 8pt; }
.lk1 { background-color: #7C2D12; }
.lk2 { background-color: #EA580C; }
.lk3 { background-color: #F97316; }

/* twee manieren van filmen */
.modes { width: 100%; }
.modes td { width: 50%; vertical-align: top; padding: 12pt 13pt; font-size: 9pt;
            line-height: 1.5; background-color: #fafafa; border: 0.75pt solid #ededed; }
.modes .mh { font-size: 10.5pt; font-weight: bold; color: #0b0b0b; margin-bottom: 1pt; }
.modes .ms { font-size: 7.5pt; letter-spacing: 1pt; color: #F97316; font-weight: bold; }
.modes .left { border-top: 3pt solid #FB923C; }
.modes .right { border-top: 3pt solid #0b0b0b; }
.recipe { background-color: #FFF4EC; border-left: 3pt solid #F97316; padding: 10pt 12pt;
          font-size: 8.7pt; color: #7C2D12; line-height: 1.5; margin-top: 9pt; }

/* raw structuur */
.raw { width: 100%; }
.raw th { background-color: #0b0b0b; color: #fff; font-size: 8pt; text-align: left;
          padding: 7pt 9pt; letter-spacing: 1pt; }
.raw td { font-size: 8.7pt; padding: 9pt; vertical-align: top; line-height: 1.45;
          border-bottom: 0.75pt solid #eee; }
.raw .num { width: 6%; font-weight: bold; color: #fff; text-align: center; font-size: 11pt; }
.raw .beat { width: 21%; font-weight: bold; color: #0b0b0b; }
.raw .beat span { display: block; color: #9a9a9a; font-size: 7pt; letter-spacing: 0.5pt;
                  font-weight: normal; margin-top: 2pt; }
.raw .shoot { width: 41%; color: #333; }
.raw .feel { width: 32%; color: #7C2D12; font-style: italic; }
.n1 { background-color: #7C2D12; } .n2 { background-color: #9A3412; }
.n3 { background-color: #C2410C; } .n4 { background-color: #EA580C; } .n5 { background-color: #F97316; }

/* emotie-boog */
.arccap { font-size: 8pt; color: #9a9a9a; letter-spacing: 1pt; margin: 16pt 0 5pt 0; font-weight: bold; }
.arc { width: 100%; }
.arc td { text-align: center; padding: 10pt 5pt; border: 2pt solid #fff; line-height: 1.3;
          font-weight: bold; font-size: 9.5pt; width: 25%; }
.arc span { display: block; font-weight: normal; font-size: 7.5pt; margin-top: 1pt; }
.ar1 { background-color: #FCD9B6; color: #7C2D12; }
.ar2 { background-color: #FBA968; color: #7C2D12; }
.ar3 { background-color: #F97316; color: #fff; }
.ar4 { background-color: #C2410C; color: #fff; }

/* afstemmingsvragen */
.q { width: 100%; margin: 5pt 0; }
.q td { vertical-align: middle; }
.q .qn { width: 32%; font-size: 9.3pt; font-weight: bold; color: #0b0b0b; padding: 6pt 10pt 6pt 0; }
.q .qn span { display: block; font-weight: normal; color: #9a9a9a; font-size: 7.5pt; margin-top: 2pt; }
.pole { background-color: #fafafa; border: 0.75pt solid #ededed; padding: 6pt 9pt; font-size: 8.2pt;
        color: #444; width: 30%; line-height: 1.4; }
.pole.lean { background-color: #FFF4EC; border: 0.75pt solid #FED7AA;
             border-left: 3.5pt solid #F97316; color: #7C2D12; }
.pole .lab { display: block; font-size: 6.5pt; letter-spacing: 1pt; color: #b5b5b5;
             margin-bottom: 2pt; font-weight: bold; }
.pole.lean .lab { color: #F97316; }
.pole.lean b { color: #7C2D12; }
.vs { text-align: center; color: #d0d0d0; font-size: 7.5pt; width: 4%; }

.flow { background-color: #0b0b0b; color: #fff; padding: 12pt 15pt; font-size: 9.3pt;
        margin-top: 9pt; line-height: 1.55; }
.flow b { color: #FB923C; }
.foot { font-size: 7.5pt; color: #b5b5b5; letter-spacing: 0.5pt; margin-top: 10pt; }
"""

PAGE1 = """
<table class="kick"><tr><td class="kl">DRAAIVISIE</td><td class="kr">FLANEUR VLOG #01</td></tr></table>

<div class="h1">Zo zie ik het voor me, Regi</div>
<p class="lead">Kijk, voordat we gaan draaien wil ik je laten zien hoe ik deze video voor me zie. Niet om
het dicht te timmeren, maar zodat jij weet dat we er echt over hebben nagedacht. Onderaan staan een
paar vragen. Beantwoord die, en dan maken we het precies zoals jij het wil. <b>Niks gescript, niks
nep, gewoon jouw verhaal, goed gebracht.</b></p>

<div class="h2"><span class="bar">|</span>&nbsp; De look in 3 woorden</div>
<table class="look">
  <tr>
    <td class="lk1"><span class="w">RAUW</span><br><span class="s">Echte momenten. Geen reclame, geen poppenkast. Twijfel en druk mogen erin.</span></td>
    <td class="lk2"><span class="w">CINEMATISCH</span><br><span class="s">Wel netjes gefilmd. Natuurlijk licht, golden hour in Dubai, rustige beelden.</span></td>
    <td class="lk3"><span class="w">ECHT</span><br><span class="s">Niks gescript. Jouw stem draagt de video. Personal brand, geen AI-slop.</span></td>
  </tr>
</table>

<div class="h2"><span class="bar">|</span>&nbsp; Twee manieren waarop we filmen</div>
<table class="modes">
  <tr>
    <td class="left">
      <div class="ms">MANIER 1</div>
      <div class="mh">Vlog: jij, in het moment</div>
      POV en handheld. Jij praat gewoon tegen de camera, in het moment zelf. Energie, tempo,
      directheid. De kijker zit naast je in de auto, snap je? Dit zijn de ankers van de video.
    </td>
    <td class="right">
      <div class="ms">MANIER 2</div>
      <div class="mh">Doc: het grotere verhaal</div>
      Mooie beelden op de gimbal, rustig en observerend. Jouw interview van Dag 1 loopt eroverheen
      als voice-over. Dat is de ruggengraat. Hier krijgt het verhaal zijn diepte.
    </td>
  </tr>
</table>

<div class="recipe"><b>Even praktisch:</b> natuurlijk licht waar het kan. Rustige bewegingen, geen
overproductie. Eén kleurgrading over Dubai en Amsterdam zodat het één geheel is. En onthoud: één
eerlijk moment van druk is meer waard dan tien mooie shots.</div>
<pdf:nextpage />
"""

PAGE2 = """
<table class="kick"><tr><td class="kl">DRAAIVISIE</td><td class="kr">DE RUWE OPBOUW</td></tr></table>

<div class="h1">Hoe de video in elkaar zit</div>
<p class="lead">Dit is het skelet. Per blok wat we filmen en wat het moet voelen. Nog niet in beton,
jouw antwoorden bepalen de rest. Maar zo loopt het: <b>van rust in Dubai naar de gok van Black Friday.</b></p>

<table class="raw">
  <tr><th>&nbsp;</th><th>Blok</th><th>Wat we filmen</th><th>Wat het voelt</th></tr>
  <tr>
    <td class="num n1">1</td>
    <td class="beat">De inzet<span>COLD OPEN / ~0:30</span></td>
    <td class="shoot">Korte teaser. Jij noemt waar het om gaat (~€2M), een flits Dubai en Amsterdam.</td>
    <td class="feel">Spanning. Dit ga je niet missen.</td>
  </tr>
  <tr>
    <td class="num n2">2</td>
    <td class="beat">Dubai, de basis<span>BEWEGING 1 / ~3,5 min</span></td>
    <td class="shoot">Je woning en het uitzicht in ochtendlicht, je home office, jij die plant en beslist. Interview-stem eroverheen.</td>
    <td class="feel">Rust en controle. Het hoofdkantoor van je hoofd.</td>
  </tr>
  <tr>
    <td class="num n3">3</td>
    <td class="beat">Amsterdam, de machine<span>BEWEGING 2 / ~3,5 min</span></td>
    <td class="shoot">Het kantoor in vol bedrijf, 30 man aan Black Friday, jij die terugkomt waar het gebeurt.</td>
    <td class="feel">Energie. Het tempo gaat omhoog.</td>
  </tr>
  <tr>
    <td class="num n4">4</td>
    <td class="beat">De gok<span>BEWEGING 3 / ~2 min</span></td>
    <td class="shoot">De interactieve Black Friday-rollout. Jij legt uit wat er op het spel staat, de aanloop naar live.</td>
    <td class="feel">Hoogspanning. Alles staat op het spel.</td>
  </tr>
  <tr>
    <td class="num n5">5</td>
    <td class="beat">Cliffhanger<span>OUTRO / ~1 min</span></td>
    <td class="shoot">We stoppen vlak voor Black Friday. Jij stelt de vraag: gaat het lukken?</td>
    <td class="feel">Niet afgemaakt, expres. Door naar deel 2.</td>
  </tr>
</table>

<div class="arccap">DE EMOTIONELE BOOG VAN DE VIDEO</div>
<table class="arc">
  <tr>
    <td class="ar1">RUST<span>Dubai</span></td>
    <td class="ar2">ENERGIE<span>Amsterdam</span></td>
    <td class="ar3">HOOGSPANNING<span>Black Friday</span></td>
    <td class="ar4">CLIFFHANGER<span>naar deel 2</span></td>
  </tr>
</table>
<pdf:nextpage />
"""

PAGE3 = """
<table class="kick"><tr><td class="kl">DRAAIVISIE</td><td class="kr">JOUW INPUT</td></tr></table>

<div class="h1">5 vragen, dan maken we het af</div>
<p class="lead">Ik heb overal al een richting gekozen zodat jij niet hoeft na te denken. Die staat
oranje gemarkeerd. Ben je het ermee eens? Top. Niet? Zeg het, dan draaien we het om. <b>Kost je
twee minuten.</b></p>

<table class="q">
  <tr>
    <td class="qn">1. Hoe persoonlijk?<span>de emotionele laag</span></td>
    <td class="pole"><span class="lab">OF JUIST</span>Dieper persoonlijk: waarom Dubai, wat het kost om weg te zijn.</td>
    <td class="vs">of</td>
    <td class="pole lean"><span class="lab">MIJN VOORSTEL</span><b>Werk en afstand. Jij runt een €2M-maand van 5.000 km verderop. Plus één eerlijk moment van druk.</b></td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">2. Toon en tempo?<span>het ritme van de montage</span></td>
    <td class="pole lean"><span class="lab">MIJN VOORSTEL</span><b>Rustig en strak, met energie-pieken in Amsterdam. Heaton-stijl.</b></td>
    <td class="vs">of</td>
    <td class="pole"><span class="lab">OF JUIST</span>Snel en energiek, klassieke vlog-cadans.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">3. Cijfers en schermen?<span>wat mag letterlijk in beeld</span></td>
    <td class="pole"><span class="lab">OF JUIST</span>Gewoon tonen: bedragen, dashboards, omzet.</td>
    <td class="vs">of</td>
    <td class="pole lean"><span class="lab">MIJN VOORSTEL</span><b>Suggereren, niet laten zien. Spanning zonder dat je gevoelige cijfers prijsgeeft.</b></td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">4. Hoeveel Dubai-lifestyle?<span>woning, uitzicht, auto</span></td>
    <td class="pole lean"><span class="lab">MIJN VOORSTEL</span><b>Gedoseerd. Lifestyle als decor van het werk, niet als flex. Lambo's huren werkt toch niet meer.</b></td>
    <td class="vs">of</td>
    <td class="pole"><span class="lab">OF JUIST</span>Vol erin, of juist bijna niks.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">5. Het einde?<span>waar we stoppen</span></td>
    <td class="pole lean"><span class="lab">MIJN VOORSTEL</span><b>Stoppen vlak voor Black Friday. De uitkomst wordt deel 2.</b></td>
    <td class="vs">of</td>
    <td class="pole"><span class="lab">OF JUIST</span>Toch de uitkomst meepakken in deze video.</td>
  </tr>
</table>

<div class="flow">
<b>Zo werkt het:</b> jij vinkt deze 5 dingen af of stuurt bij. Dan maak ik het storyboard en de
shotlist definitief. En dan draaien we.<br>
Zo weet jij zeker dat het jouw video wordt, en weet ik zeker dat ik 'm strak kan neerzetten. Geen gedoe.
</div>
<p class="foot">DRAAIVISIE V1 / FLANEUR FOUNDER VLOG #01 / VOOR REGI</p>
"""

html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{PAGE1}{PAGE2}{PAGE3}</body></html>"

out = "Flaneur-Vlog-Draaivisie.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(html, dest=f)
print(f"PDF geschreven: {out}")
