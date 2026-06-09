#!/usr/bin/env python3
"""Bouwt het VOLLEDIGE pakket (alle docs + visueel storyboard) in EEN HTML-bestand.
De storyboard-beelden laden via hun Higgsfield-CDN-URL, dus open in een browser.
Print > Opslaan als PDF geeft een enkel PDF-bestand met alles erin."""
import os
import markdown

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DOCS = [
    "00-regi-brief.md", "01-concept.md", "06-publicatie.md", "08-strategie.md",
]

BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_2zm0bcmvhYtqhUNIemq9z5Hr7Ai/"
SB_FRAMES = [
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

def md_html(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    html = markdown.markdown(raw, extensions=["tables", "fenced_code", "sane_lists"])
    # strip interne nummering uit de koppen voor de Regi-versie (01: Concept -> Concept)
    import re
    html = re.sub(r'(<h1>)\s*\d+:\s*', r'\1', html, count=1)
    return html

def storyboard_html():
    out = ['<section class="doc sb"><h1>Visueel storyboard</h1>',
           '<p class="lead">Zo ziet het eruit. Een reeks beelden in volgorde, zodat je de film al voor je ziet. '
           'Warm in Dubai, koeler in Amsterdam: dat contrast draagt het verhaal.</p>']
    for beat, frames in SB_FRAMES:
        out.append(f'<h2>{beat}</h2><div class="sbgrid">')
        for sc, cap, fn in frames:
            out.append(f'<figure class="sbcard"><img src="{BASE}{fn}" alt="SC {sc}">'
                       f'<figcaption><span class="sbsc">SC {sc}</span> {cap}</figcaption></figure>')
        out.append('</div>')
    out.append('</section>')
    return "".join(out)

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500&display=swap');
/* Displayfont op een plek: vervang var(--display) door jouw font zodra de naam bekend is */
:root{--display:'Inter',system-ui,sans-serif;--accent:#F97316;--accent2:#C2410C;--ink:#17150f;--muted:#6f6a62;--line:#ece9e4;--bg:#fbfaf8}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:15px;-webkit-font-smoothing:antialiased}
.wrap{max-width:840px;margin:0 auto;padding:0 34px 100px}

/* cover */
.cover{min-height:90vh;display:flex;flex-direction:column;justify-content:center;padding:64px 0}
.cover .tag{font-family:'JetBrains Mono',monospace;letter-spacing:.34em;font-size:12px;color:var(--accent);text-transform:uppercase}
.cover h1{font-family:var(--display);font-weight:900;font-size:88px;line-height:.92;letter-spacing:-3px;margin:20px 0 12px;color:#100f0b}
.cover .sub{font-size:21px;color:var(--muted);font-weight:500}
.cover .rule{width:68px;height:5px;background:var(--accent);border-radius:3px;margin:36px 0}
.cover .meta{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);letter-spacing:.05em;line-height:1.9}

/* secties */
section.doc{padding-top:62px}
section.doc>h1{font-family:var(--display);font-weight:800;font-size:31px;letter-spacing:-.5px;color:#100f0b;padding-top:18px;margin-bottom:18px;border-top:3px solid var(--accent);display:inline-block}
h2{font-family:var(--display);font-weight:700;font-size:20px;letter-spacing:-.2px;margin:30px 0 10px;color:#100f0b}
h3{font-weight:700;font-size:15.5px;color:var(--accent2);margin:20px 0 6px}
h4{font-weight:700;font-size:14px;margin:14px 0 4px}
p{margin:10px 0}
.lead{font-size:18px;line-height:1.6;color:var(--muted);font-weight:500}
strong{font-weight:700;color:#100f0b}
ul,ol{margin:10px 0 10px 22px}
li{margin:6px 0}
a{color:var(--accent2);text-decoration:none}
em{color:var(--muted)}

/* callout (de Menno-intro's) */
blockquote{background:#fff5ec;border-left:3px solid var(--accent);padding:15px 20px;margin:18px 0;border-radius:0 10px 10px 0;color:#6b3d1f}
blockquote p{margin:0;font-size:15.5px}

/* tabellen */
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13.5px;border:1px solid var(--line);border-radius:10px;overflow:hidden}
th{background:var(--accent);color:#fff;text-align:left;padding:10px 13px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:500}
td{padding:10px 13px;border-top:1px solid var(--line);vertical-align:top}
tr:nth-child(even) td{background:#faf8f5}

/* code / beschrijving-template */
code{font-family:'JetBrains Mono',monospace;font-size:12.5px;background:#f1efea;padding:2px 6px;border-radius:5px;color:#9A3412}
pre{background:#141310;color:#ece9e4;border-radius:12px;padding:20px 22px;overflow:auto;margin:16px 0;font-size:12.5px;line-height:1.6}
pre code{background:none;color:#ece9e4;padding:0;font-size:12.5px}
hr{display:none}

/* storyboard */
.sbgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin:20px 0}
.sbcard{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(20,15,5,.06)}
.sbcard img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#eee}
figcaption{padding:12px 14px;font-size:13px;color:#3a3631;line-height:1.45}
.sbsc{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;color:#fff;background:var(--accent);padding:2px 8px;border-radius:20px;margin-right:7px;letter-spacing:.04em;vertical-align:middle}

@media print{
  body{background:#fff}
  .cover{min-height:auto;padding:30px 0 56px;break-after:page}
  .cover h1{font-size:74px}
  section.doc{break-before:page;padding-top:20px}
  .sbcard{break-inside:avoid;box-shadow:none}
  .sbgrid{gap:12px}
  a{color:inherit}
}
@media(max-width:680px){.sbgrid{grid-template-columns:1fr}.cover h1{font-size:58px}.wrap{padding:0 20px 64px}}
"""

cover = ('<div class="cover"><div class="tag">Founder vlog &middot; Productiepakket</div>'
         '<h1>Flaneur</h1><div class="sub">Vlog #01 &middot; Dubai &rarr; Black Friday</div>'
         '<div class="rule"></div>'
         '<div class="meta">Voor: Regi (Flaneur)<br>Versie: definitief &middot; juni 2026</div></div>')

sections = "".join(f'<section class="doc">{md_html(p)}</section>' for p in DOCS)
html = (f'<!doctype html><html lang="nl"><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>Flaneur Vlog #01 - Productiepakket</title><style>{CSS}</style></head>'
        f'<body><div class="wrap">{cover}{sections}{storyboard_html()}</div></body></html>')

with open("Flaneur-Vlog-01-Productiepakket.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: Flaneur-Vlog-01-Productiepakket.html")
