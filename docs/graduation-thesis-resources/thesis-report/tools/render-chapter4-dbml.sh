#!/usr/bin/env bash
# Sync Chapter 4 database schema figure previews from canonical web-exported SVG.
#
# Canonical thesis figures (DO NOT overwrite by default):
#   assets/figures/chapter4-db-*-schema.svg  (export from dbdiagram.io)
#
# LaTeX: \includesvg{chapter4-db-*-schema.svg} — see .latexmkrc (-shell-escape).
#
# Default: read existing .svg only → refresh .pdf/.png previews via rsvg-convert.
#
# Opt-in DBML CLI render (overwrites .svg — disabled unless explicit):
#   ALLOW_DBML_SVG_OVERWRITE=1 bash tools/render-chapter4-dbml.sh --from-dbml
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mode="from-svg"
if [[ "${1:-}" == "--from-dbml" ]]; then
  mode="from-dbml"
  shift
elif [[ "${1:-}" == "--from-svg" ]]; then
  shift
elif [[ "${1:-}" == "--dbml-only" ]]; then
  mode="dbml-only"
  shift
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage: render-chapter4-dbml.sh [options] [chapter4-db-catalog-schema ...]

Default (safe): convert existing web-exported SVG in assets/figures/ to PDF/PNG previews.
                Never touches .svg unless you pass --from-dbml with ALLOW_DBML_SVG_OVERWRITE=1.

Options:
  --from-svg     Same as default.
  --from-dbml    Regenerate .svg from DBML via dbml-renderer (OVERWRITES web exports).
  --dbml-only    Regenerate .svg from DBML only (no PDF/PNG).
  -h, --help     Show this help.

Policy: see assets/figures/CHAPTER4-DB-SCHEMA-SVG.md
EOF
  exit 0
fi

if ! command -v rsvg-convert >/dev/null; then
  echo "rsvg-convert is required." >&2
  exit 1
fi

require_dbml_overwrite_permission() {
  if [[ "${ALLOW_DBML_SVG_OVERWRITE:-}" != "1" ]]; then
    echo "ERROR: Regenerating SVG from DBML is disabled." >&2
    echo "Thesis figures must stay as web-exported SVG in assets/figures/." >&2
    echo "See assets/figures/CHAPTER4-DB-SCHEMA-SVG.md" >&2
    echo "To force overwrite: ALLOW_DBML_SVG_OVERWRITE=1 $0 --from-dbml" >&2
    exit 1
  fi
}

if [[ $# -gt 0 ]]; then
  targets=("$@")
else
  targets=()
  if [[ "$mode" == "from-svg" ]]; then
    for svg in assets/figures/chapter4-db-*-schema.svg; do
      [[ -f "$svg" ]] || continue
      targets+=("$(basename "$svg" .svg)")
    done
  else
    for src in assets/diagrams/dbml/chapter4-*-schema.dbml; do
      [[ -f "$src" ]] || continue
      targets+=("$(basename "$src" .dbml)")
    done
  fi
fi

if [[ ${#targets[@]} -eq 0 ]]; then
  echo "No chapter4-db-*-schema targets found." >&2
  exit 1
fi

convert_svg_previews() {
  local svg="$1" pdf="$2" png="$3"
  echo "==> Preview $svg -> $pdf"
  rsvg-convert -f pdf -o "$pdf" "$svg"
  echo "==> Preview $svg -> $png"
  rsvg-convert -w 2400 -f png -o "$png" "$svg"
}

for target in "${targets[@]}"; do
  base="${target%.dbml}"
  base="${base%.svg}"
  base="${base/chapter4-db-/chapter4-}"
  src="assets/diagrams/dbml/${base}.dbml"
  svg="assets/figures/${base/chapter4-/chapter4-db-}.svg"
  pdf="assets/figures/${base/chapter4-/chapter4-db-}.pdf"
  png="assets/figures/${base/chapter4-/chapter4-db-}.png"

  if [[ "$mode" == "from-svg" ]]; then
    if [[ ! -f "$svg" ]]; then
      echo "Missing canonical SVG (export from dbdiagram.io): $svg" >&2
      exit 1
    fi
    convert_svg_previews "$svg" "$pdf" "$png"
    continue
  fi

  require_dbml_overwrite_permission

  if [[ ! -f "$src" ]]; then
    echo "Missing DBML source: $src" >&2
    exit 1
  fi

  echo "==> OVERWRITE $svg from $src (dbml-renderer)"
  npx -y @softwaretechnik/dbml-renderer -i "$src" -f svg -o "$svg"

  if [[ "$mode" != "dbml-only" ]]; then
    convert_svg_previews "$svg" "$pdf" "$png"
  fi
done

echo "OK: Chapter 4 DB schema figures (mode=$mode)."
