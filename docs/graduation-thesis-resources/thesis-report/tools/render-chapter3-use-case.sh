#!/usr/bin/env bash
# Render Hình 3.1 (PlantUML use case) → SVG + PDF trong assets/figures/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PU="${PLANTUML_JAR:-$ROOT/tools/plantuml.jar}"
SRC="assets/diagrams/chapter3-actor-use-case-overview.puml"
OUT="$ROOT/assets/figures"
DOT="${GRAPHVIZ_DOT:-/opt/homebrew/bin/dot}"

if [[ ! -f "$PU" ]]; then
  echo "Missing PlantUML jar: $PU" >&2
  exit 1
fi
if [[ ! -x "$DOT" ]] && ! command -v dot >/dev/null; then
  echo "Graphviz 'dot' required. Install: brew install graphviz" >&2
  exit 1
fi
DOT="$(command -v dot || echo "$DOT")"

java -jar "$PU" -charset UTF-8 -graphvizdot "$DOT" -tsvg -o "$OUT" "$SRC"
rsvg-convert -f pdf -o "$OUT/chapter3-actor-use-case-overview.pdf" \
  "$OUT/chapter3-actor-use-case-overview.svg"

echo "OK: $OUT/chapter3-actor-use-case-overview.{svg,pdf}"
