#!/usr/bin/env bash
# Chapter 2: Excalidraw-only pipeline (icons embedded in .excalidraw → SVG → PDF).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Fetch icon assets"
bash "$TOOLS/fetch-chapter2-icons.sh"

if [[ "${1:-}" != "--export-only" ]]; then
  echo "==> Generate .excalidraw with embedded images (bỏ qua nếu đã chỉnh tay: --export-only)"
  node "$TOOLS/generate-chapter2-excalidraw.mjs"
else
  echo "==> Export-only: giữ nguyên .excalidraw đã chỉnh tay"
fi

echo "==> Export .excalidraw → SVG (embedded logos preserved)"
node "$TOOLS/export-chapter2-excalidraw.mjs"

if ! command -v rsvg-convert >/dev/null; then
  echo "rsvg-convert required: brew install librsvg" >&2
  exit 1
fi

FIGURES="$ROOT/assets/figures"
echo "==> Convert SVG → PDF"
for svg in "$FIGURES"/chapter2-*.svg; do
  [[ -f "$svg" ]] || continue
  base="$(basename "$svg" .svg)"
  rsvg-convert -f pdf -o "$FIGURES/${base}.pdf" "$svg"
  echo "PDF: $FIGURES/${base}.pdf"
done

echo "OK: Chapter 2 diagrams rendered from Excalidraw only."
