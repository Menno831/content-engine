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
    ("05-interview.md", "Het interview (vooraf klaar)"),
    ("06-publicatie.md", "Publicatieplan"),
    ("07-illustratie-prompts.md", "Storyboard-illustratie prompts"),
    ("08-strategie.md", "Content- & distributiestrategie"),
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
body { font-family: "DejaVu", sans-serif; font-size: 9.5pt; color: #1f1f1f; line-height: 1.55; }
h1 { font-size: 19pt; color: #0a0a0a; border-bottom: 2.5pt solid #F97316;
     padding-bottom: 5pt; margin-top: 8pt; margin-bottom: 10pt; }
h2 { font-size: 13.5pt; color: #0a0a0a; margin-top: 20pt; margin-bottom: 6pt;
     border-left: 4pt solid #F97316; padding-left: 9pt; }
h3 { font-size: 11pt; color: #C2410C; margin-top: 12pt; }
h4 { font-size: 9.8pt; color: #1a1a1a; margin-top: 9pt; }
p { margin: 4pt 0; }
a { color: #C2410C; text-decoration: none; }
strong { color: #0a0a0a; }
ul, ol { margin: 4pt 0 4pt 6pt; }
li { margin: 2pt 0; }
table { width: 100%; margin: 7pt 0; border: 0.5pt solid #d8d8d8; }
th { background-color: #F97316; color: #ffffff; font-size: 7.5pt;
     padding: 4pt 5pt; text-align: left; letter-spacing: 0.5pt; text-transform: uppercase; }
td { font-size: 8pt; padding: 4pt 5pt; border-bottom: 0.5pt solid #e6e6e6;
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

/* visueel storyboard */
.sbtab { width: 100%; margin: 6pt 0; }
.sbtab td { width: 50%; vertical-align: top; padding: 5pt 6pt; }
.sbimg { width: 100%; border: 0.5pt solid #e0e0e0; }
.sbsc { font-size: 7.5pt; color: #C2410C; font-weight: bold; margin-top: 3pt; }
.sbcap { font-size: 8pt; color: #3a3a3a; line-height: 1.35; }
"""

FONTS = """
@font-face { font-family: "DejaVu"; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'); }
@font-face { font-family: "DejaVu"; font-weight: bold; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'); }
@font-face { font-family: "DejaVuMono"; src: url('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'); }
"""

cover = """
<div class="cover">
  <div class="cover-tag">FOUNDER VLOG &middot; PRODUCTIEPAKKET</div>
  <div class="cover-title">Flaneur</div>
  <div class="cover-sub">Vlog #01 &middot; Dubai &rarr; Black Friday</div>
  <div class="cover-rule"></div>
  <div class="cover-meta">Voor: Regi (Flaneur)</div>
  <div class="cover-meta">Versie: definitief &middot; juni 2026</div>
</div>
<pdf:nextpage />
"""

regi_brief = """
<div class="regi-tag">VOOR REGI &middot; IN 2 MINUTEN</div>
<div class="regi-h1">Jouw eerste vlog, in het kort</div>
<p class="regi-lead">Een POV founder-vlog die je verhuizing naar Dubai en de aanloop naar de grootste
Black Friday van Flaneur (~&euro;2M) door elkaar weeft. Authentiek, niet gescript,
wij waarborgen alleen de verhaallijn zodat het altijd klopt. Jij hoeft alleen voor de camera te staan.</p>

<div class="regi-h2">De video in 5 beats</div>
<table class="tl">
  <tr>
    <td class="tl-cold"><span class="lab">COLD OPEN</span><br><span class="big">De inzet</span><br>~0:30</td>
    <td class="tl-1"><span class="lab">BEWEGING 1</span><br><span class="big">Dubai, de basis</span><br>~3,5 min</td>
    <td class="tl-2"><span class="lab">BEWEGING 2</span><br><span class="big">Amsterdam, de machine</span><br>~3,5 min</td>
    <td class="tl-3"><span class="lab">BEWEGING 3</span><br><span class="big">De gok</span><br>~2 min</td>
    <td class="tl-out"><span class="lab">OUTRO</span><br><span class="big">Cliffhanger</span><br>~1 min</td>
  </tr>
</table>
<p class="tl-sub">Rust &amp; controle (Dubai) &rarr; energie &amp; inzet (Amsterdam) &rarr; spanning (Black Friday) &rarr; cliffhanger naar deel 2.</p>

<div class="regi-h2">Wat we van jou nodig hebben: 3 dingen</div>
<table class="tasks">
  <tr>
    <td><div class="num">1</div><br><strong>Interview-blok</strong><br>10&ndash;15 min op Dag 1. Jij praat vrij, wij stellen 6 vragen. Hieruit knippen we de hele voice-over.</td>
    <td><div class="num">2</div><br><strong>Twee draaidagen</strong><br>Dubai (woning + home office) en Amsterdam (kantoor vol Black Friday-team). Richtlijn: eerste helft november.</td>
    <td><div class="num">3</div><br><strong>Toestemmingen</strong><br>Filmen op kantoor regelen, en laten weten welke schermen/cijfers n&iacute;&eacute;t in beeld mogen.</td>
  </tr>
</table>

<div class="regi-h2">De twee draaidagen</div>
<table class="days">
  <tr><th>Dag 1: Dubai</th><th>Dag 2: Amsterdam</th></tr>
  <tr>
    <td>Woning + uitzicht in ochtendlicht &middot; home office &middot; interview-blok &middot; rustig reflectie-moment.</td>
    <td>Kantoor in vol bedrijf &middot; team aan Black Friday &middot; jij legt de interactieve rollout uit.</td>
  </tr>
</table>

<div class="why"><strong>Waarom dit werkt:</strong> we eindigen vl&aacute;k v&oacute;&oacute;r Black Friday.
De uitkomst (~&euro;2M?) wordt deel 2 &rarr; kijkers blijven hangen en komen terug.</div>

<p class="more">Alle details (shot-by-shot storyboard, gear, planning en publicatie) staan op de volgende pagina's. Deze pagina is het enige dat jij hoeft te lezen.</p>
<pdf:nextpage />
"""

# ---- Visueel storyboard: embed lokale frames indien aanwezig in ./storyboard/ ----
SB_FRAMES = [
    ("COLD OPEN: de inzet", [
        ("0.1", "Montage: de inzet (Dubai, laptop, kantoor, &euro;2M)", "hf_20260608_132843_6d785931-656c-4094-be33-204d8ec4ed82.png"),
        ("0.2", "Founder kijkt uit het raam, Dubai bij zonsopkomst", "hf_20260608_132512_c4aec70d-7f73-4e8a-971f-0d93ea0997a7.png"),
        ("0.3", "Titelkaart-moment, penthouse bij dageraad", "hf_20260608_132845_7d1a26dc-d4e1-498e-a5cb-05d7c397b520.png"),
    ]),
    ("BEWEGING 1: Dubai, de nieuwe basis", [
        ("1.1a", "Establishing: de woning vanuit de lucht", "hf_20260608_132846_82ceffe7-3581-4a45-a5d2-d2dc610870f0.png"),
        ("1.1b", "Rondleiding door de woning (gimbal)", "hf_20260608_132846_f8c62273-486a-4673-be32-c4c7a9d66b67.png"),
        ("1.1c", "Detailshots: ochtendroutine", "hf_20260608_132848_4f9cb773-16e7-4af7-a5e7-53bd39afd60d.png"),
        ("1.2a", "Aan het bureau, het commandocentrum", "hf_20260608_132850_a8bed041-fec1-485f-8a9a-4b9f24247f45.png"),
        ("1.2b", "Over-the-shoulder: dashboards & Black Friday-planning", "hf_20260608_132852_dd578769-b5d7-4442-b563-035954bb18e0.png"),
        ("1.2c", "Videocall met het Amsterdam-team", "hf_20260608_132853_e38e2ed0-18cc-48c9-acb8-1fb0df2d9284.png"),
        ("1.3a", "Anker-moment: founder reflecteert in de lens", "hf_20260608_132855_7bda6278-b8b8-4454-be3e-1982b2d10679.png"),
        ("1.3b", "Stilte-beeld: nadenken bij de skyline", "hf_20260608_132857_f67607b4-571d-4da9-8bc2-30a6e25ffb68.png"),
    ]),
    ("BEWEGING 2: Amsterdam, de machine draait", [
        ("2.1a", "Harde cut naar Amsterdam (kantoorgevel)", "hf_20260608_132859_dd0923a7-96ea-4b73-a24a-112ff7564ab9.png"),
        ("2.1b", "Establishing kantoor, drukte zichtbaar", "hf_20260608_132900_cd1e7bf5-cbe4-4a45-a0a0-6078bda85dc1.png"),
        ("2.2a", "Founder loopt binnen, wordt begroet", "hf_20260608_132923_2122a1a3-5d80-4485-bed7-ecd6d15ea612.png"),
        ("2.2b", "B-roll: team aan het werk", "hf_20260608_132924_30cefca3-2241-4305-9919-afc29725ba39.png"),
        ("2.2c", "Korte interactie met teamleden", "hf_20260608_132925_c86f7ff4-d80e-4453-beab-3fd86cbf6e54.png"),
        ("2.3a", "Rollout uitgelegd bij het scherm/whiteboard", "hf_20260608_132926_d0da2706-4936-4a12-b4d4-98a990d45dd1.png"),
        ("2.3b", "Teaser: schermen/proces (niet onthuld)", "hf_20260608_132927_420a7aea-4c5d-4ec3-87c4-5ddc7aad5300.png"),
        ("2.4a", "Fulfillment center (optioneel): de schaal", "hf_20260608_132930_40f75307-1134-4988-94c0-7dc4d5eb3c1c.png"),
    ]),
    ("BEWEGING 3: de gok / climax", [
        ("3.1", "Toon-omslag, avond: nu is het wachten", "hf_20260608_132931_6dc5729b-2aa3-465d-9c19-c552a7a0fab8.png"),
        ("3.2", "Spanningsmontage / countdown", "hf_20260608_132932_91e88e21-d483-42d1-b3bd-f08631b2b7a5.png"),
        ("3.3", "De drempel: klaar om live te gaan (cliffhanger)", "hf_20260608_132933_272db8c6-b3ea-4dd9-8997-5765ef201036.png"),
    ]),
    ("OUTRO: de cliffhanger", [
        ("4.1", "Recht in de lens: de belofte", "hf_20260608_132934_5e6fdd1e-8e63-4b5b-a058-b5cd8bb6640e.png"),
        ("4.2", "Laatste beeld: skyline bij schemer", "hf_20260608_132935_0a0dbe5e-1c71-4540-ab7e-f4c33254ff3b.png"),
    ]),
]

def build_storyboard():
    sections, any_img = [], False
    for beat, frames in SB_FRAMES:
        present = [(sc, cap, fn) for sc, cap, fn in frames
                   if os.path.exists(os.path.join("storyboard", fn))]
        if not present:
            continue
        any_img = True
        sections.append(f'<h2>{beat}</h2><table class="sbtab">')
        for i in range(0, len(present), 2):
            sections.append("<tr>")
            for sc, cap, fn in present[i:i + 2]:
                sections.append(
                    f'<td><img class="sbimg" src="storyboard/{fn}">'
                    f'<div class="sbsc">SC {sc}</div><div class="sbcap">{cap}</div></td>')
            sections.append("</tr>")
        sections.append("</table>")
    if not any_img:
        return "", False
    head = ('<pdf:nextpage /><h1>Visueel storyboard</h1>'
            '<p>Cinematische moodframes in volgorde, zodat je de hele film voor je ziet voordat we draaien. '
            'Het zijn AI-gegenereerde sfeerbeelden met een stand-in, niet de uiteindelijke opnames. '
            'Warme grade in Dubai, koelere grade in Amsterdam.</p>')
    return head + "".join(sections), True

sb_html, sb_present = build_storyboard()

toc = '<div class="toc"><div class="toc-h">Inhoud</div><ol>'
for _, title in DOCS:
    toc += f'<li>{title}</li>'
if sb_present:
    toc += '<li>Visueel storyboard</li>'
toc += "</ol></div>"

body = cover + regi_brief + toc
for path, title in DOCS:
    body += '<pdf:nextpage />'
    body += md_to_html(path)
body += sb_html

footer = '<div id="footerContent" style="text-align:center; color:#999; font-size:7.5pt;">Flaneur Vlog #01 &middot; Productiepakket &middot; vertrouwelijk</div>'

full = f"<html><head><style>{FONTS}{CSS}</style></head><body>{footer}{body}</body></html>"

out = "Flaneur-Vlog-01-Productiepakket.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(full, dest=f, encoding="utf-8")
print("PDF geschreven:", out)
