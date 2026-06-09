#!/usr/bin/env python3
"""Bouwt de SENPA-voorbereiding (Istanbul) als een strak HTML-document."""
import os
import markdown

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DOCS = [
    "01-concept.md", "02-structuur.md", "03-shotlist.md",
    "04-interview.md", "05-logistiek.md",
]

def md_html(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    html = markdown.markdown(raw, extensions=["tables", "fenced_code", "sane_lists"])
    import re
    html = re.sub(r'(<h1>)\s*\d+:\s*', r'\1', html, count=1)
    return html

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
@media print{body{background:#fff}.cover{min-height:auto;padding:30px 0 56px;break-after:page}.cover h1{font-size:70px}section.doc{break-before:page;padding-top:20px}a{color:inherit}}
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
        f'<body><div class="wrap">{cover}{sections}</div></body></html>')

with open("SENPA-Istanbul-Voorbereiding.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: SENPA-Istanbul-Voorbereiding.html")
