#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Alle ontbrekende keys in één keer zetten. Per key: plakken, enter.
# Leeg laten + enter = overslaan. Aan het eind herdeployt hij zelf.
#
# Gebruik:  bash ktr-studio/bin/zet-keys.sh   (vanuit ~/content-engine)
# ════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/../.."   # naar de repo-root (waar .vercel staat)

zet() {
  local naam="$1" waar="$2"
  echo ""
  echo "── $naam"
  echo "   ($waar)"
  read -r -s -p "   Plak de waarde en druk enter (leeg = overslaan): " waarde
  echo ""
  if [ -z "$waarde" ]; then
    echo "   → overgeslagen"
    return
  fi
  # Oude weghalen mag falen (bestaat soms niet), daarna vers zetten.
  vercel env rm "$naam" production -y >/dev/null 2>&1 || true
  printf '%s' "$waarde" | vercel env add "$naam" production >/dev/null
  echo "   → gezet ✓"
}

echo "KTR Studio — keys zetten (waardes worden nergens getoond of bewaard)"

zet ANTHROPIC_API_KEY  "console.anthropic.com → API keys — Jarvis, briefings, DM-concepten, Studio, Boost"
zet RESEND_API_KEY     "resend.com → API keys — editor- en rapportmails"
zet YOUTUBE_API_KEY    "console.cloud.google.com → YouTube Data API v3 — YT-stats en eigen-kanaal-sync"
zet CLARITY_API_TOKEN  "clarity.microsoft.com → Settings → Data Export — websitebezoekers automatisch"

echo ""
echo "── Herdeployen zodat de nieuwe keys actief worden…"
URL=$(vercel ls content-engine-kr5c 2>/dev/null | grep -oE 'https://[^ ]+vercel\.app' | head -1)
if [ -n "$URL" ]; then
  vercel redeploy "$URL" >/dev/null 2>&1 && echo "   → deploy gestart ✓" || echo "   → herdeploy handmatig: vercel redeploy $URL"
else
  echo "   → geen deploy-URL gevonden; push een commit of draai: vercel redeploy <url>"
fi
echo ""
echo "Klaar. De zelftest van morgenochtend bevestigt wat er nu werkt,"
echo "of check direct: https://content-engine-kr5c.vercel.app/platform/channels"
