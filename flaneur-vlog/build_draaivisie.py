#!/usr/bin/env python3
"""Bouwt de Draaivisie — een korte, visuele 2-pager om met Regi af te stemmen
hoe we de documentaire/vlog inschieten. Aparte PDF, los van het grote pakket."""
import os
from xhtml2pdf import pisa

os.chdir(os.path.dirname(os.path.abspath(__file__)))

CSS = """
@page { size: A4; margin: 1.6cm 1.7cm; }
body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 10pt; }
.tag { color: #C2410C; font-size: 9pt; letter-spacing: 2.5pt; font-weight: bold; }
.h1 { font-size: 24pt; color: #0a0a0a; margin: 4pt 0 6pt 0; }
.lead { font-size: 10pt; color: #333; line-height: 1.5; margin-bottom: 4pt; }
.h2 { font-size: 11pt; color: #0a0a0a; margin: 15pt 0 6pt 0;
      border-left: 4pt solid #F97316; padding-left: 7pt; }

/* look in 3 woorden */
.look { width: 100%; margin: 2pt 0; }
.look td { text-align: center; vertical-align: middle; color: #fff; padding: 11pt 5pt;
           border: 1.5pt solid #fff; line-height: 1.35; width: 33%; }
.look .w { font-size: 14pt; font-weight: bold; letter-spacing: 0.5pt; }
.look .s { font-size: 7.5pt; }
.lk1 { background-color: #7C2D12; }
.lk2 { background-color: #EA580C; }
.lk3 { background-color: #F97316; }

/* twee modes */
.modes { width: 100%; margin: 2pt 0; }
.modes td { width: 50%; vertical-align: top; padding: 10pt 11pt; font-size: 8.6pt;
            line-height: 1.45; background-color: #fafafa; border: 0.5pt solid #eee; }
.modes .m-h { font-size: 10pt; font-weight: bold; color: #C2410C; margin-bottom: 2pt; }
.modes .m-vlog { border-top: 3pt solid #FB923C; }
.modes .m-doc { border-top: 3pt solid #0a0a0a; }
.treat { font-size: 8.3pt; color: #555; font-style: italic; margin-top: 6pt; line-height: 1.45; }

/* raw structuur */
.raw { width: 100%; margin: 2pt 0; }
.raw th { background-color: #0a0a0a; color: #fff; font-size: 8pt; text-align: left;
          padding: 6pt 8pt; letter-spacing: 0.5pt; }
.raw td { font-size: 8.4pt; padding: 8pt; vertical-align: top; line-height: 1.4;
          border-bottom: 0.5pt solid #eee; }
.raw .beat { font-weight: bold; color: #0a0a0a; width: 22%; }
.raw .beat span { display: block; color: #C2410C; font-size: 7pt; letter-spacing: 0.5pt; }
.raw .shoot { width: 42%; color: #333; }
.raw .feel { width: 36%; color: #7C2D12; font-style: italic; }
.raw tr.alt td { background-color: #fafafa; }

/* afstemmingsvragen */
.q { width: 100%; margin: 7pt 0; }
.q td { vertical-align: middle; }
.q .qn { width: 34%; font-size: 8.7pt; font-weight: bold; color: #0a0a0a; padding: 7pt 8pt 7pt 0; }
.q .qn span { display: block; font-weight: normal; color: #888; font-size: 7.3pt; margin-top: 1pt; }
.pole { background-color: #fafafa; border: 0.5pt solid #eee; padding: 7pt 8pt; font-size: 8pt;
        color: #444; width: 28%; line-height: 1.3; }
.pole.lean { background-color: #FFF7ED; border: 0.5pt solid #FED7AA;
             border-left: 3pt solid #F97316; color: #7C2D12; font-weight: bold; }
.pole .lab { display: block; font-size: 6.5pt; letter-spacing: 0.5pt; color: #aaa; margin-bottom: 1pt; }
.pole.lean .lab { color: #F97316; }
.vs { text-align: center; color: #ccc; font-size: 8pt; width: 4%; }

.flow { background-color: #0a0a0a; color: #fff; padding: 11pt 13pt; font-size: 9pt;
        margin: 16pt 0 4pt 0; line-height: 1.5; }
.flow b { color: #FB923C; }
.foot { font-size: 7.5pt; color: #999; font-style: italic; margin-top: 8pt; }
"""

PAGE1 = """
<div class="tag">DRAAIVISIE &mdash; ZO ZIEN WIJ HET VOOR ONS</div>
<div class="h1">Hoe we de documentaire inschieten</div>
<p class="lead">Dit is <strong>ons</strong> beeld van de draaidagen &mdash; de look, de manier van filmen en de ruwe
opbouw. Nog niet definitief: het is bedoeld om samen scherp te krijgen. Beantwoord onderaan de paar
afstemmingsvragen, en wij finaliseren het storyboard zodat het exact jouw beeld wordt.</p>

<div class="h2">De look in 3 woorden</div>
<table class="look">
  <tr>
    <td class="lk1"><span class="w">RAUW</span><br><span class="s">Echte momenten, geen reclamespot. Twijfel en druk mogen in beeld.</span></td>
    <td class="lk2"><span class="w">CINEMATISCH</span><br><span class="s">Ondiepe scherptediepte, natuurlijk licht, golden hour in Dubai.</span></td>
    <td class="lk3"><span class="w">ECHT</span><br><span class="s">Niet gescript, wel gestructureerd. Jouw stem draagt de film.</span></td>
  </tr>
</table>

<div class="h2">Twee camera-modes die we afwisselen</div>
<table class="modes">
  <tr>
    <td class="m-vlog">
      <div class="m-h">VLOG-mode &mdash; "nu, met jou"</div>
      POV en handheld. Jij praat tegen de camera, in het moment. Energie, tempo, directheid.
      Dit zijn de <strong>ankers</strong>: de kijker zit naast je.
    </td>
    <td class="m-doc">
      <div class="m-h">DOC-mode &mdash; "het grotere verhaal"</div>
      Cinematische b-roll op gimbal, observerend. Jouw interview-stem (Dag&nbsp;1) loopt eroverheen
      als <strong>voice-over &mdash; de ruggengraat</strong>. Rustiger, gelaagd, betekenis.
    </td>
  </tr>
</table>
<p class="treat"><strong>Visueel recept:</strong> natuurlijk licht waar het kan &middot; rustige bewegingen, geen overproductie &middot;
&eacute;&eacute;n consistente kleurgrading over Dubai + Amsterdam &middot; &eacute;&eacute;n moment van echte druk &gt; tien mooie shots.</p>
<pdf:nextpage />
"""

PAGE2 = """
<div class="tag">DRAAIVISIE &mdash; DE RUWE OPBOUW</div>
<div class="h1">Hoe de film in elkaar zit</div>
<p class="lead">De ruwe montage-structuur: per blok wat we <strong>filmen</strong> en wat het moet <strong>voelen</strong>.
Dit is het skelet &mdash; jouw antwoorden hieronder bepalen de definitieve invulling.</p>

<table class="raw">
  <tr><th>Blok</th><th>Wat we filmen</th><th>Wat het voelt</th></tr>
  <tr>
    <td class="beat"><span>COLD OPEN &middot; ~0:30</span>De inzet</td>
    <td class="shoot">Korte, scherpe teaser: jij die de maand benoemt (~&euro;2M), een flits Dubai + Amsterdam.</td>
    <td class="feel">Spanning. "Dit ga je niet missen."</td>
  </tr>
  <tr class="alt">
    <td class="beat"><span>BEWEGING 1 &middot; ~3,5 min</span>Dubai &mdash; de basis</td>
    <td class="shoot">Woning + uitzicht in ochtendlicht, home office, jij die plant en beslist. Interview-stem eroverheen.</td>
    <td class="feel">Rust &amp; controle. Het "hoofdkantoor van je hoofd".</td>
  </tr>
  <tr>
    <td class="beat"><span>BEWEGING 2 &middot; ~3,5 min</span>Amsterdam &mdash; de machine</td>
    <td class="shoot">Kantoor in vol bedrijf, 30 man aan Black Friday, jij die terugkomt waar het gebeurt.</td>
    <td class="feel">Energie &amp; inzet. Tempo omhoog.</td>
  </tr>
  <tr class="alt">
    <td class="beat"><span>BEWEGING 3 &middot; ~2 min</span>De gok</td>
    <td class="shoot">De interactieve Black Friday-rollout: jij legt de inzet uit, de aanloop naar lanceren.</td>
    <td class="feel">Hoogspanning. Alles staat op het spel.</td>
  </tr>
  <tr>
    <td class="beat"><span>OUTRO &middot; ~1 min</span>Cliffhanger</td>
    <td class="shoot">We stoppen vl&aacute;k v&oacute;&oacute;r Black Friday. Jij benoemt de open vraag: gaat het lukken?</td>
    <td class="feel">Onafgemaakt &mdash; op zijn best. Naar deel 2.</td>
  </tr>
</table>
<pdf:nextpage />

<div class="h2">Afstemmingsvragen &mdash; zodat dit jouw beeld wordt</div>
<p class="lead">Vink per vraag aan wat klopt, of stuur bij. Onze neiging staat al gemarkeerd &mdash; dus dit kan in 2 minuten.</p>
<table class="q">
  <tr>
    <td class="qn">1. Hoe persoonlijk?<span>De emotionele laag van de film</span></td>
    <td class="pole"><span class="lab">KANT A</span>Puur werk &amp; afstand: €2M-maand op 5.000 km leiden.</td>
    <td class="vs">&harr;</td>
    <td class="pole lean"><span class="lab">ONZE NEIGING</span>Werk-focus, mét één eerlijk moment van druk/twijfel.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">2. Toon &amp; tempo?<span>Het ritme van de montage</span></td>
    <td class="pole lean"><span class="lab">ONZE NEIGING</span>Rustig &amp; reflectief (Heaton-look), met energie-pieken in Amsterdam.</td>
    <td class="vs">&harr;</td>
    <td class="pole"><span class="lab">KANT B</span>Snel &amp; energiek, klassieke vlog-cadans.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">3. Cijfers &amp; schermen?<span>Wat mag letterlijk in beeld</span></td>
    <td class="pole"><span class="lab">KANT A</span>Bewust tonen: €-bedragen, dashboards, omzet.</td>
    <td class="vs">&harr;</td>
    <td class="pole lean"><span class="lab">ONZE NEIGING</span>Suggereren, niet onthullen: spanning zonder gevoelige cijfers.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">4. Hoeveel Dubai-lifestyle?<span>Woning, uitzicht, auto</span></td>
    <td class="pole lean"><span class="lab">ONZE NEIGING</span>Dosering: lifestyle als décor van het werk, niet als flex.</td>
    <td class="vs">&harr;</td>
    <td class="pole"><span class="lab">KANT B</span>Vol erin (aspirational) óf juist minimaal.</td>
  </tr>
</table>
<table class="q">
  <tr>
    <td class="qn">5. Cliffhanger-einde?<span>Waar we stoppen</span></td>
    <td class="pole lean"><span class="lab">ONZE NEIGING</span>Eindigen vlák vóór Black Friday → uitkomst = deel 2.</td>
    <td class="vs">&harr;</td>
    <td class="pole"><span class="lab">KANT B</span>Toch de uitkomst meepakken in deze film.</td>
  </tr>
</table>

<div class="flow">
<b>Het proces:</b> jij vinkt de 5 vragen af (of stuurt bij) &rarr; wij finaliseren storyboard + shotlist &rarr; we draaien.<br>
Zo weten we zeker: <b>dit is hoe jij het voor je ziet, en zo gaan wij het fixen.</b>
</div>
<p class="foot">Draaivisie v1 &middot; Flaneur Founder-Vlog #01 &middot; ter afstemming met Regi &middot; vertrouwelijk</p>
"""

html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{PAGE1}{PAGE2}</body></html>"

out = "Flaneur-Vlog-Draaivisie.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(html, dest=f)
print(f"PDF geschreven: {out}")
