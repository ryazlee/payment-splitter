#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -x "$chrome" ]]; then
  echo "Google Chrome is required to render scripts/og-card.html" >&2
  exit 1
fi

"$chrome" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --screenshot="$root/public/og.png" \
  "file://$root/scripts/og-card.html"
