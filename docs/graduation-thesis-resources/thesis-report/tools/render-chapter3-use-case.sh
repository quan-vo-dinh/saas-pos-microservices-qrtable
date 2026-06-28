#!/usr/bin/env bash
# Render Chapter 3 PlantUML diagrams to SVG, PDF, and PNG in assets/figures/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PU="${PLANTUML_JAR:-$ROOT/tools/plantuml.jar}"
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
if ! command -v rsvg-convert >/dev/null; then
  echo "rsvg-convert required: brew install librsvg" >&2
  exit 1
fi
DOT="$(command -v dot || echo "$DOT")"
mkdir -p "$OUT"

if [[ $# -gt 0 ]]; then
  targets=("$@")
else
  targets=(
    "chapter3-actor-use-case-overview"
    "chapter3-business-flow"
  )
fi

for target in "${targets[@]}"; do
  base="${target%.puml}"
  src="assets/diagrams/${base}.puml"
  svg="$OUT/${base}.svg"
  pdf="$OUT/${base}.pdf"
  png="$OUT/${base}.png"

  if [[ ! -f "$src" ]]; then
    echo "Missing PlantUML source: $src" >&2
    exit 1
  fi

  echo "==> Render $src -> $svg"
  java -jar "$PU" -charset UTF-8 -graphvizdot "$DOT" -tsvg -o "$OUT" "$src"
  echo "==> Convert $svg -> $pdf"
  rsvg-convert --background-color=white -f pdf -o "$pdf" "$svg"
  echo "==> Convert $svg -> $png"
  rsvg-convert --background-color=white -f png -o "$png" "$svg"
done

echo "OK: Chapter 3 PlantUML diagrams rendered."
