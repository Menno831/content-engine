#!/usr/bin/env python3
"""Bouw een professionele PDF uit de Flaneur vlog-productiedocs."""
import os
import markdown
from xhtml2pdf import pisa

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DOCS = [
    ("01-concept.md", "Concept & narratief"),
    ("02-storyboard.md", "Storyboard (shot-by-shot)"),
    ("03-shotlist.md", "Shotlist per locatie"),
    ("04-draaischema.md", "Draaischema, logistiek & gear"),
    ("05-beslissingen.md", "Beslissingen & interview-vragen"),
    ("06-publicatie.md", "Publicatieplan"),
    ("07-illustratie-prompts.md", "Storyboard-illustratie prompts"),
]

# Emoji die DejaVu niet kent -> vervang door tekst-equivalent
EMOJI = {
    "✳️": "[*]", "✳": "[*]", "🟡": "[?]", "⚠️": "[!]", "⚠": "[!]",
    "🤝": "", "→": "&rarr;", "←": "&larr;",
}

def clean(text):
    for k, v in EMOJI.items():
        text = text.replace(k, v)
    # strip resterende losse checkbox emoji-varianten
    text = text.replace("[x]", "&#10003;").replace("[ ]", "&#9744;")
    return text

def md_to_html(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    raw = clean(raw)
    html = markdown.markdown(
        raw, extensions=["tables", "fenced_code", "sane_lists"]
    )
    return html

CSS = """
@page { size: A4; margin: 2.2cm 1.8cm 2cm 1.8cm;
        @frame footer { -pdf-frame-content: footerContent;
                        bottom: 1cm; height: 1cm; left: 1.8cm; right: 1.8cm; } }
body { font-family: "DejaVu", sans-serif; font-size: 9.5pt; color: #1a1a1a; line-height: 1.5; }
h1 { font-size: 19pt; color: #0a0a0a; border-bottom: 2.5pt solid #F97316;
     padding-bottom: 5pt; margin-top: 8pt; }
h2 { font-size: 13.5pt; color: #0a0a0a; margin-top: 16pt;
     border-left: 4pt solid #F97316; padding-left: 7pt; }
h3 { font-size: 11pt; color: #C2410C; margin-top: 12pt; }
h4 { font-size: 9.8pt; color: #1a1a1a; margin-top: 9pt; }
p { margin: 4pt 0; }
a { color: #C2410C; text-decoration: none; }
strong { color: #0a0a0a; }
ul, ol { margin: 4pt 0 4pt 6pt; }
li { margin: 2pt 0; }
table { width: 100%; margin: 7pt 0; border: 0.5pt solid #d8d8d8; }
th { background-color: #F97316; color: #ffffff; font-size: 8pt;
     padding: 3pt; text-align: left; }
td { font-size: 8pt; padding: 3pt; border-bottom: 0.5pt solid #e6e6e6;
     vertical-align: top; }
tr:nth-child(even) td { background-color: #fafafa; }
code { font-family: "DejaVuMono", monospace; font-size: 8pt;
       background-color: #f3f3f3; color: #9A3412; }
pre { background-color: #f6f6f4; border: 0.5pt solid #e0e0e0;
      border-left: 3pt solid #F97316; padding: 7pt; font-size: 7.6pt;
      font-family: "DejaVuMono", monospace; color: #222;
      white-space: pre-wrap; word-wrap: break-word; }
pre code { background-color: transparent; color: #222; }
blockquote { border-left: 3pt solid #cccccc; background-color: #fafafa;
             padding: 5pt 9pt; color: #444; margin: 6pt 0; }
hr { border: none; border-top: 0.5pt solid #dddddd; margin: 12pt 0; }
.cover { text-align: center; }
.cover-tag { color: #C2410C; font-size: 10pt; letter-spacing: 3pt; margin-top: 180pt; }
.cover-title { font-size: 40pt; color: #0a0a0a; margin: 14pt 0 0 0; }
.cover-sub { font-size: 15pt; color: #555; margin-top: 6pt; }
.cover-rule { border-top: 2.5pt solid #F97316; width: 30%; margin: 26pt auto; }
.cover-meta { font-size: 9.5pt; color: #777; margin-top: 8pt; }
.toc-h { font-size: 16pt; color: #0a0a0a; border-bottom: 2pt solid #F97316; padding-bottom: 4pt; }
.toc li { margin: 5pt 0; font-size: 10.5pt; }

/* ---- Regi 1-pager ---- */
.regi-tag { color: #C2410C; font-size: 9pt; letter-spacing: 2.5pt; font-weight: bold; }
.regi-h1 { font-size: 23pt; color: #0a0a0a; margin: 4pt 0 6pt 0; }
.regi-lead { font-size: 10pt; color: #333; line-height: 1.5; margin-bottom: 6pt; }
.regi-h2 { font-size: 11pt; color: #0a0a0a; margin: 16pt 0 6pt 0;
           border-left: 4pt solid #F97316; padding-left: 7pt; }
.tl { width: 100%; margin: 2pt 0; }
.tl td { text-align: center; vertical-align: middle; padding: 9pt 4pt; color: #fff;
         font-size: 7pt; border: 1.5pt solid #ffffff; line-height: 1.35; }
.tl .lab { font-size: 6.2pt; letter-spacing: 1pt; }
.tl .big { font-size: 9pt; }
.tl-cold { background-color: #7C2D12; width: 14%; }
.tl-1 { background-color: #EA580C; width: 26%; }
.tl-2 { background-color: #F97316; width: 26%; }
.tl-3 { background-color: #FB923C; width: 20%; }
.tl-out { background-color: #C2410C; width: 14%; }
.tl-sub { font-size: 8pt; color: #666; font-style: italic; margin: 4pt 0 2pt 0; }
.tasks { width: 100%; margin: 2pt 0; }
.tasks td { width: 33%; vertical-align: top; padding: 9pt; font-size: 8.3pt;
            background-color: #fafafa; border: 0.5pt solid #eee;
            border-top: 2.5pt solid #F97316; line-height: 1.4; }
.tasks .num { background-color: #F97316; color: #fff; font-size: 11pt; font-weight: bold;
              padding: 1pt 6pt; margin-bottom: 3pt; }
.days { width: 100%; margin: 2pt 0; }
.days th { background-color: #0a0a0a; color: #fff; font-size: 9pt; padding: 6pt; text-align: left; }
.days td { font-size: 8.3pt; padding: 7pt; vertical-align: top;
           background-color: #fafafa; border: 0.5pt solid #eee; line-height: 1.4; }
.why { background-color: #FFF7ED; border: 0.5pt solid #FED7AA; border-left: 3pt solid #F97316;
       padding: 8pt 10pt; font-size: 9pt; color: #7C2D12; margin: 14pt 0 6pt 0; }
.more { font-size: 8pt; color: #999; font-style: italic; margin-top: 8pt; }
"""

FONTS = """
@font-face { font-family: "DejaVu"; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'); }
@font-face { font-family: "DejaVu"; font-weight: bold; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'); }
@font-face { font-family: "DejaVuMono"; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'); }
"""

cover = """
<div class="cover">
  <div class="cover-tag">FOUNDER VLOG &mdash; PRODUCTIEPAKKET</div>
  <div class="cover-title">Flaneur</div>
  <div class="cover-sub">Vlog #01 &middot; Dubai &rarr; Black Friday</div>
  <div class="cover-rule"></div>
  <div class="cover-meta">Voor: Regi (Flaneur)</div>
  <div class="cover-meta">Opgesteld door KTR Studio</div>
  <div class="cover-meta">Versie: opzet &middot; juni 2026</div>
</div>
<pdf:nextpage />
"""

regi_brief = """
<div class="regi-tag">VOOR REGI &mdash; IN 2 MINUTEN</div>
<div class="regi-h1">Jouw eerste vlog, in het kort</div>
<p class="regi-lead">Een POV founder-vlog die je verhuizing naar Dubai en de aanloop naar de grootste
Black Friday van Flaneur (~&euro;2M) door elkaar weeft. Authentiek, niet gescript &mdash;
wij waarborgen alleen de verhaallijn zodat het altijd klopt. Jij hoeft alleen voor de camera te staan.</p>

<div class="regi-h2">De video in 5 beats</div>
<table class="tl">
  <tr>
    <td class="tl-cold"><span class="lab">COLD OPEN</span><br><span class="big">De inzet</span><br>~0:30</td>
    <td class="tl-1"><span class="lab">BEWEGING 1</span><br><span class="big">Dubai &mdash; de basis</span><br>~3,5 min</td>
    <td class="tl-2"><span class="lab">BEWEGING 2</span><br><span class="big">Amsterdam &mdash; de machine</span><br>~3,5 min</td>
    <td class="tl-3"><span class="lab">BEWEGING 3</span><br><span class="big">De gok</span><br>~2 min</td>
    <td class="tl-out"><span class="lab">OUTRO</span><br><span class="big">Cliffhanger</span><br>~1 min</td>
  </tr>
</table>
<p class="tl-sub">Rust &amp; controle (Dubai) &rarr; energie &amp; inzet (Amsterdam) &rarr; spanning (Black Friday) &rarr; cliffhanger naar deel 2.</p>

<div class="regi-h2">Wat we van jou nodig hebben &mdash; 3 dingen</div>
<table class="tasks">
  <tr>
    <td><div class="num">1</div><br><strong>Interview-blok</strong><br>10&ndash;15 min op Dag 1. Jij praat vrij, wij stellen 6 vragen. Hieruit knippen we de hele voice-over. Dit vervangt de voice note.</td>
    <td><div class="num">2</div><br><strong>Twee draaidagen</strong><br>Dubai (woning + home office) en Amsterdam (kantoor vol Black Friday-team). Richtlijn: eerste helft november.</td>
    <td><div class="num">3</div><br><strong>Toestemmingen</strong><br>Filmen op kantoor regelen, en laten weten welke schermen/cijfers n&iacute;&eacute;t in beeld mogen.</td>
  </tr>
</table>

<div class="regi-h2">De twee draaidagen</div>
<table class="days">
  <tr><th>Dag 1 &mdash; Dubai</th><th>Dag 2 &mdash; Amsterdam</th></tr>
  <tr>
    <td>Woning + uitzicht in ochtendlicht &middot; home office &middot; interview-blok &middot; rustig reflectie-moment.</td>
    <td>Kantoor in vol bedrijf &middot; team aan Black Friday &middot; jij legt de interactieve rollout uit.</td>
  </tr>
</table>

<div class="why"><strong>Waarom dit werkt:</strong> we eindigen vl&aacute;k v&oacute;&oacute;r Black Friday.
De uitkomst (~&euro;2M?) wordt deel 2 &rarr; kijkers blijven hangen en komen terug.</div>

<p class="more">Alle details &mdash; shot-by-shot storyboard, gear, planning en publicatie &mdash; staan op de volgende pagina's. Deze pagina is het enige dat jij hoeft te lezen.</p>
<pdf:nextpage />
"""

toc = '<div class="toc"><div class="toc-h">Inhoud</div><ol>'
for _, title in DOCS:
    toc += f'<li>{title}</li>'
toc += "</ol></div>"

body = cover + regi_brief + toc
for path, title in DOCS:
    body += '<pdf:nextpage />'
    body += md_to_html(path)

footer = '<div id="footerContent" style="text-align:center; color:#999; font-size:7.5pt;">Flaneur Vlog #01 &middot; Productiepakket &middot; KTR Studio &middot; vertrouwelijk</div>'

full = f"<html><head><style>{FONTS}{CSS}</style></head><body>{footer}{body}</body></html>"

out = "Flaneur-Vlog-01-Productiepakket.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(full, dest=f, encoding="utf-8")
print("PDF geschreven:", out)
