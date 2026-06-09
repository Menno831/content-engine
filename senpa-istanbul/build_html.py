#!/usr/bin/env python3
"""Bouwt de SENPA-voorbereiding (Istanbul) als een strak HTML-document."""
import os
import markdown

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DOCS = [
    "01-concept.md", "02-structuur.md", "03-shotlist.md", "04-interview.md",
]

def md_html(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    html = markdown.markdown(raw, extensions=["tables", "fenced_code", "sane_lists"])
    import re
    html = re.sub(r'(<h1>)\s*\d+:\s*', r'\1', html, count=1)
    return html

BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_2zm0bcmvhYtqhUNIemq9z5Hr7Ai/"
SB_FRAMES = [
    ("Beweging 1: aankomst", [
        ("S1", "De onopvallende gevel", "hf_20260609_104523_45b49a3d-e59b-40d8-8435-b6d149e28f12.png"),
        ("S2", "Founder loopt naar binnen", "hf_20260609_104524_af78df37-f319-49e8-89c8-5f9a5c7b6dd3.png"),
        ("S3", "De deur naar de werkvloer", "hf_20260609_104525_3c0821da-1bf4-4279-981a-8a41de086efa.png"),
    ]),
    ("Beweging 2: de schaal", [
        ("S4", "De werkvloer opent zich", "hf_20260609_104527_768ae52e-4e2f-4957-a276-d251d36fa1b9.png"),
        ("S5", "Langs de machinerijen", "hf_20260609_104528_9c8afef0-447b-4b3b-8abe-71f774e75f78.png"),
        ("S6", "Het ritme van de vloer", "hf_20260609_104530_ba7ef888-879a-47bf-b523-86a633f661f9.png"),
    ]),
    ("Beweging 3: het ambacht", [
        ("S7", "Rollen stof en materialen", "hf_20260609_104532_3cc226d9-66b7-4463-b3a1-e32e520282f8.png"),
        ("S8", "Handen keuren het materiaal", "hf_20260609_104534_e77f4114-2b9a-4f2e-90b8-8ede72fd5d02.png"),
        ("S9", "De cutting room", "hf_20260609_104536_a41a6505-30e2-45de-9c29-570f01405403.png"),
        ("S10", "Patroondelen leggen", "hf_20260609_104537_55f99848-7513-4eb0-a531-077b90f000e6.png"),
        ("S11", "Naald door de stof", "hf_20260609_104538_12ffa38b-d8b7-4dd8-930b-ca8f8b87ba9a.png"),
        ("S12", "Vakvrouw aan de machine", "hf_20260609_104557_8fcbe541-010a-4673-8e9e-ec1f5c50b378.png"),
        ("S13", "Rij naaimachines in werking", "hf_20260609_104558_76cf01bb-cb71-48f1-a239-b1152f2d886e.png"),
        ("S14", "Stomen en persen", "hf_20260609_104559_84b62c4a-208b-4abf-a780-1466551dd59e.png"),
        ("S15", "Kwaliteitscontrole", "hf_20260609_104600_942f59ee-ef5d-4810-93d4-80e7db29a728.png"),
    ]),
    ("Beweging 4: Flaneur wordt gemaakt", [
        ("S16", "Flaneur-stukken in productie", "hf_20260609_104601_93e79a02-2d5e-4593-8fc8-ea090c84915c.png"),
        ("S17", "Founder bekijkt een afgewerkt stuk", "hf_20260609_104602_8ab9ea27-0d20-49b9-953f-8239403d4ed7.png"),
        ("S18", "Label en afwerking in detail", "hf_20260609_104603_2f542f58-75f6-4f3d-9a35-b09c5c6c75c4.png"),
    ]),
    ("Beweging 5: de standaard & de relatie", [
        ("S19", "Founder in gesprek met de eigenaar", "hf_20260609_104604_ffa65b10-8b1d-4f90-b0b3-f93a3b94a2cf.png"),
        ("S20", "Portret van een maker", "hf_20260609_104604_c3ee2551-52ef-42b6-ab05-e28c67f39d74.png"),
        ("S21", "Het partnerschap", "hf_20260609_104606_61630106-3ac7-465a-ace5-d3b2d484390c.png"),
    ]),
    ("Outro", [
        ("S22", "Laatste beeld: de vloer", "hf_20260609_104607_6194787c-9a2b-4350-b6fd-03a1a53d7216.jpeg"),
    ]),
]

def storyboard_html():
    out = ['<section class="doc sb"><h1>Visueel storyboard</h1>',
           '<p class="lead">Zo ziet het eruit. Een reeks beelden in volgorde, generiek en merkvrij gehouden, '
           'zodat je de film al voor je ziet voordat we draaien.</p>']
    for beat, frames in SB_FRAMES:
        out.append(f'<h2>{beat}</h2><div class="sbgrid">')
        for sc, cap, fn in frames:
            out.append(f'<figure class="sbcard"><img src="{BASE}{fn}" alt="{sc}">'
                       f'<figcaption><span class="sbsc">{sc}</span>{cap}</figcaption></figure>')
        out.append('</div>')
    out.append('</section>')
    return "".join(out)

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500&display=swap');
:root{--display:'Inter',system-ui,sans-serif;--accent:#F97316;--accent2:#C2410C;--ink:#17150f;--muted:#6f6a62;--line:#ece9e4;--bg:#fbfaf8}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:15px;-webkit-font-smoothing:antialiased}
.wrap{max-width:840px;margin:0 auto;padding:0 34px 100px}
.cover{min-height:90vh;display:flex;flex-direction:column;justify-content:center;padding:64px 0}
.cover .tag{font-family:'JetBrains Mono',monospace;letter-spacing:.34em;font-size:12px;color:var(--accent);text-transform:uppercase}
.cover h1{font-family:var(--display);font-weight:900;font-size:84px;line-height:.92;letter-spacing:-3px;margin:20px 0 12px;color:#100f0b}
.cover .sub{font-size:21px;color:var(--muted);font-weight:500}
.cover .rule{width:68px;height:5px;background:var(--accent);border-radius:3px;margin:36px 0}
.cover .meta{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);letter-spacing:.05em;line-height:1.9}
section.doc{padding-top:62px}
section.doc>h1{font-family:var(--display);font-weight:800;font-size:31px;letter-spacing:-.5px;color:#100f0b;padding-top:18px;margin-bottom:18px;border-top:3px solid var(--accent);display:inline-block}
h2{font-family:var(--display);font-weight:700;font-size:20px;letter-spacing:-.2px;margin:30px 0 10px;color:#100f0b}
h3{font-weight:700;font-size:15.5px;color:var(--accent2);margin:20px 0 6px}
p{margin:10px 0}
strong{font-weight:700;color:#100f0b}
ul,ol{margin:10px 0 10px 22px}
li{margin:6px 0}
a{color:var(--accent2);text-decoration:none}
em{color:var(--muted)}
blockquote{background:#fff5ec;border-left:3px solid var(--accent);padding:15px 20px;margin:18px 0;border-radius:0 10px 10px 0;color:#6b3d1f}
blockquote p{margin:0;font-size:15.5px}
hr{display:none}
.lead{font-size:18px;line-height:1.6;color:var(--muted);font-weight:500}
.sbgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin:20px 0}
.sbcard{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(20,15,5,.06)}
.sbcard img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#eee}
figcaption{padding:12px 14px;font-size:13px;color:#3a3631;line-height:1.45}
.sbsc{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;color:#fff;background:var(--accent);padding:2px 8px;border-radius:20px;margin-right:7px;letter-spacing:.04em;vertical-align:middle}
@media print{body{background:#fff}.cover{min-height:auto;padding:30px 0 56px;break-after:page}.cover h1{font-size:70px}section.doc{break-before:page;padding-top:20px}.sbcard{break-inside:avoid;box-shadow:none}a{color:inherit}}
@media(max-width:680px){.cover h1{font-size:54px}.wrap{padding:0 20px 64px}}
"""

cover = ('<div class="cover"><div class="tag">Documentaire &middot; Voorbereiding</div>'
         '<h1>Made in Istanbul</h1>'
         '<div class="sub">De fabriek achter de grote namen &middot; SENPA</div>'
         '<div class="rule"></div>'
         '<div class="meta">Voor: Regi (Flaneur)<br>Voorbereiding &middot; juni 2026</div></div>')

sections = "".join(f'<section class="doc">{md_html(p)}</section>' for p in DOCS)
html = (f'<!doctype html><html lang="nl"><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>SENPA Istanbul - Voorbereiding</title><style>{CSS}</style></head>'
        f'<body><div class="wrap">{cover}{sections}{storyboard_html()}</div></body></html>')

with open("SENPA-Istanbul-Voorbereiding.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: SENPA-Istanbul-Voorbereiding.html")
