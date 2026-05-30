#!/usr/bin/env bash
# Download brand/tech SVG icons for Chapter 2 Excalidraw diagrams (Simple Icons CDN).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$ROOT/assets/diagrams/chapter2-icons"
mkdir -p "$ICON_DIR"

BASE="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons"

fetch() {
  local slug="$1"
  local out="$2"
  if [[ -f "$ICON_DIR/$out" ]]; then
    echo "skip $out"
    return 0
  fi
  curl -fsSL "$BASE/${slug}.svg" -o "$ICON_DIR/$out"
  echo "ok $out"
}

fetch apachekafka kafka.svg
fetch keycloak keycloak.svg
fetch postgresql postgresql.svg
fetch socketdotio websocket.svg
fetch openid openid.svg
fetch nginx nginx.svg
fetch docker docker.svg
fetch googlecloud cloud.svg
fetch redis redis.svg
fetch ubereats fnb-delivery.svg || fetch doordash fnb-delivery.svg || true

if [[ ! -f "$ICON_DIR/scan-qr.svg" ]]; then
  curl -fsSL "$BASE/qrcode.svg" -o "$ICON_DIR/scan-qr.svg" 2>/dev/null \
    || curl -fsSL "$BASE/scan.svg" -o "$ICON_DIR/scan-qr.svg" 2>/dev/null \
    || echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#0f172a"/><rect x="3" y="3" width="7" height="7" fill="#fff"/><rect x="14" y="3" width="7" height="7" fill="#fff"/><rect x="3" y="14" width="7" height="7" fill="#fff"/></svg>' > "$ICON_DIR/scan-qr.svg"
fi

echo "Icons ready: $ICON_DIR"
