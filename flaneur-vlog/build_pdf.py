#!/usr/bin/env python3
"""Bouw een professionele PDF uit de Flaneur vlog-productiedocs."""
import re
import markdown
from xhtml2pdf import pisa

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

toc = '<div class="toc"><div class="toc-h">Inhoud</div><ol>'
for _, title in DOCS:
    toc += f'<li>{title}</li>'
toc += "</ol></div>"

body = cover + toc
for path, title in DOCS:
    body += '<pdf:nextpage />'
    body += md_to_html(path)

footer = '<div id="footerContent" style="text-align:center; color:#999; font-size:7.5pt;">Flaneur Vlog #01 &middot; Productiepakket &middot; KTR Studio &middot; vertrouwelijk</div>'

full = f"<html><head><style>{FONTS}{CSS}</style></head><body>{footer}{body}</body></html>"

out = "Flaneur-Vlog-01-Productiepakket.pdf"
with open(out, "wb") as f:
    pisa.CreatePDF(full, dest=f, encoding="utf-8")
print("PDF geschreven:", out)
