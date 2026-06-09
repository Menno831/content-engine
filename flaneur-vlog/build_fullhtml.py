#!/usr/bin/env python3
"""Bouwt het VOLLEDIGE pakket (alle docs + visueel storyboard) in EEN HTML-bestand.
De storyboard-beelden laden via hun Higgsfield-CDN-URL, dus open in een browser.
Print > Opslaan als PDF geeft een enkel PDF-bestand met alles erin."""
import os
import markdown

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DOCS = [
    "00-regi-brief.md", "01-concept.md", "02-storyboard.md", "03-shotlist.md",
    "04-draaischema.md", "05-interview.md", "06-publicatie.md", "08-strategie.md",
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
    return markdown.markdown(raw, extensions=["tables", "fenced_code", "sane_lists"])

def storyboard_html():
    out = ['<section class="doc sb"><h1>Visueel storyboard</h1>',
           '<p>Referentiebeelden in volgorde die de look en de opbouw van de film laten zien. '
           'Warme grade in Dubai, koelere grade in Amsterdam.</p>']
    for beat, frames in SB_FRAMES:
        out.append(f'<h2>{beat}</h2><div class="sbgrid">')
        for sc, cap, fn in frames:
            out.append(f'<figure class="sbcard"><img src="{BASE}{fn}" alt="SC {sc}">'
                       f'<figcaption><span class="sbsc">SC {sc}</span> {cap}</figcaption></figure>')
        out.append('</div>')
    out.append('</section>')
    return "".join(out)

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c1c;line-height:1.6;background:#fff}
.wrap{max-width:860px;margin:0 auto;padding:40px 28px 80px}
.cover{text-align:center;padding:120px 0 80px;border-bottom:3px solid #F97316;margin-bottom:8px}
.cover .tag{font-family:ui-monospace,Menlo,monospace;letter-spacing:4px;color:#C2410C;font-size:13px}
.cover h1{font-size:52px;margin:14px 0 6px;letter-spacing:-1px}
.cover .sub{font-size:18px;color:#555}
.cover .meta{color:#888;font-size:13px;margin-top:18px}
section.doc{padding-top:34px}
section.doc h1{font-size:26px;border-bottom:2.5px solid #F97316;padding-bottom:7px;margin:10px 0 16px}
h2{font-size:18px;border-left:4px solid #F97316;padding-left:10px;margin:26px 0 10px}
h3{font-size:15px;color:#C2410C;margin:18px 0 6px}
h4{font-size:13.5px;margin:12px 0 4px}
p{margin:8px 0}
ul,ol{margin:8px 0 8px 22px}
li{margin:4px 0}
a{color:#C2410C;text-decoration:none}
strong{color:#0a0a0a}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
th{background:#F97316;color:#fff;text-align:left;padding:7px 9px;font-size:12px;letter-spacing:.5px;text-transform:uppercase}
td{padding:7px 9px;border-bottom:1px solid #eee;vertical-align:top}
tr:nth-child(even) td{background:#fafafa}
code{font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#f3f3f3;color:#9A3412;padding:1px 4px;border-radius:3px}
pre{background:#f6f6f4;border-left:3px solid #F97316;padding:12px;overflow:auto;margin:10px 0}
pre code{background:none;color:#222}
blockquote{border-left:3px solid #ccc;background:#fafafa;padding:8px 14px;color:#444;margin:10px 0}
hr{border:0;border-top:1px solid #ddd;margin:20px 0}
.sbgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:10px 0}
.sbcard{border:1px solid #e4e4e4;border-radius:10px;overflow:hidden}
.sbcard img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#eee}
figcaption{padding:9px 11px;font-size:13px;color:#333}
.sbsc{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#C2410C;font-weight:700;margin-right:4px}
@media print{ section.doc{break-before:page} .cover{break-after:page} .sbcard{break-inside:avoid} a{color:#1c1c1c} }
"""

cover = ('<div class="cover"><div class="tag">FOUNDER VLOG &middot; PRODUCTIEPAKKET</div>'
         '<h1>Flaneur</h1><div class="sub">Vlog #01 &middot; Dubai &rarr; Black Friday</div>'
         '<div class="meta">Voor: Regi (Flaneur) &middot; Versie: definitief &middot; juni 2026</div></div>')

sections = "".join(f'<section class="doc">{md_html(p)}</section>' for p in DOCS)
html = (f'<!doctype html><html lang="nl"><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>Flaneur Vlog #01 - Productiepakket</title><style>{CSS}</style></head>'
        f'<body><div class="wrap">{cover}{sections}{storyboard_html()}</div></body></html>')

with open("Flaneur-Vlog-01-Productiepakket.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: Flaneur-Vlog-01-Productiepakket.html")
