#!/usr/bin/env python3
"""Bouwt een visueel storyboard (HTML) uit de gegenereerde frames.
De beelden laden via hun Higgsfield-CDN-URL, dus open dit in een browser."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_2zm0bcmvhYtqhUNIemq9z5Hr7Ai/"

# (SC, caption, image-bestand)
FRAMES = [
    ("COLD OPEN: de inzet", [
        ("0.1", "Montage: de inzet (Dubai, laptop, kantoor, €2M)", "hf_20260608_132843_6d785931-656c-4094-be33-204d8ec4ed82.png"),
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

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #060606; color: #F5F0EB; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 48px 24px 80px; }
.wrap { max-width: 1180px; margin: 0 auto; }
.kick { font-family: ui-monospace, Menlo, monospace; font-size: 12px; letter-spacing: 3px; color: #F97316; text-transform: uppercase; }
h1 { font-size: 34px; font-weight: 800; margin: 8px 0 6px; }
.lead { color: #B5ADA6; max-width: 720px; line-height: 1.6; margin-bottom: 8px; }
.beat { font-size: 13px; font-family: ui-monospace, Menlo, monospace; letter-spacing: 2px; text-transform: uppercase; color: #F5F0EB; border-left: 4px solid #F97316; padding-left: 12px; margin: 48px 0 18px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
.card { background: #0C0C0C; border: 1px solid #181818; border-radius: 14px; overflow: hidden; }
.card img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; background:#111; }
.meta { padding: 12px 14px 14px; }
.sc { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #FB923C; letter-spacing: 1px; }
.cap { font-size: 14px; color: #E7E1DA; margin-top: 4px; line-height: 1.45; }
.foot { color:#6f6a64; font-size:12px; margin-top:56px; text-align:center; }
@media (max-width: 720px){ .grid{ grid-template-columns: 1fr; } }
"""

cards = []
for beat, frames in FRAMES:
    cards.append(f'<div class="beat">{beat}</div><div class="grid">')
    for sc, cap, img in frames:
        cards.append(
            f'<div class="card"><img src="{BASE}{img}" alt="SC {sc}">'
            f'<div class="meta"><div class="sc">SC {sc}</div><div class="cap">{cap}</div></div></div>'
        )
    cards.append("</div>")

html = f"""<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flaneur Vlog #01 - Visueel storyboard</title><style>{CSS}</style></head>
<body><div class="wrap">
<div class="kick">FLANEUR VLOG #01 &middot; VISUEEL STORYBOARD</div>
<h1>Zo komt het eruit te zien</h1>
<p class="lead">Een reeks cinematische moodframes in volgorde, zodat je de hele film voor je ziet voordat we draaien.
Het zijn AI-gegenereerde sfeerbeelden met een stand-in, niet de uiteindelijke opnames. Warme grade in Dubai,
koelere grade in Amsterdam: dat contrast draagt het verhaal.</p>
{''.join(cards)}
<div class="foot">Flaneur Vlog #01 &middot; Visueel storyboard &middot; vertrouwelijk</div>
</div></body></html>"""

with open("Flaneur-Storyboard.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Geschreven: Flaneur-Storyboard.html  (frames:", sum(len(f) for _, f in FRAMES), ")")
