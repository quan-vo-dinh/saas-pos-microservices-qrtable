#!/usr/bin/env bash
# Minimal Inkscape CLI shim for the LaTeX svg package when only rsvg-convert is installed.
# DBML diagrams are authored as SVG; this converts them to PDF for XeLaTeX inclusion.
set -euo pipefail

if [[ "${1:-}" == "-V" || "${1:-}" == "--version" ]]; then
  echo "Inkscape 1.2.0 (rsvg-convert shim)"
  exit 0
fi

output=""
input=""

for arg in "$@"; do
  case "$arg" in
    --export-filename=*)
      output="${arg#*=}"
      ;;
    --export-pdf=*)
      output="${arg#*=}"
      ;;
    -D | --without-gui | --export-latex | \relax)
      ;;
    *)
      if [[ -f "$arg" ]]; then
        input="$arg"
      fi
      ;;
  esac
done

if [[ -z "$output" || -z "$input" ]]; then
  echo "inkscape-rsvg-shim: expected --export-filename=<pdf> and an existing input .svg" >&2
  exit 1
fi

mkdir -p "$(dirname "$output")"
rsvg-convert -f pdf -o "$output" "$input"
