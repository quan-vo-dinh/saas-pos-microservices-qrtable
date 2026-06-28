#!/usr/bin/env bash
# Render Chapter 2 academic diagrams from PlantUML source to SVG, PDF, and PNG.
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
  targets=()
  for src in assets/diagrams/chapter2-*.puml; do
    [[ -f "$src" ]] || continue
    targets+=("$(basename "$src" .puml)")
  done
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

echo "OK: Chapter 2 PlantUML diagrams rendered."
