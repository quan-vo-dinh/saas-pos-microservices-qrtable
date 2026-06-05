#!/usr/bin/env bash
# Render Chapter 4 Mermaid diagrams to assets/figures/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]]; then
  for chrome in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    if [[ -x "$chrome" ]]; then
      export PUPPETEER_EXECUTABLE_PATH="$chrome"
      break
    fi
  done
fi

if ! pnpm exec mmdc --version >/dev/null; then
  echo "Mermaid CLI is required. Install repo dependencies, then run: pnpm install" >&2
  exit 1
fi

cleanup_files=""
cleanup() {
  if [[ -n "$cleanup_files" ]]; then
    rm -f $cleanup_files
  fi
}
trap cleanup EXIT

if [[ $# -gt 0 ]]; then
  targets=("$@")
else
  targets=()
  for src in assets/diagrams/chapter4-*.mmd; do
    [[ -f "$src" ]] || continue
    targets+=("$(basename "$src" .mmd)")
  done
fi

ICON_PACKS=(
  "@iconify-json/logos"
  "@iconify-json/simple-icons"
  "@iconify-json/mdi"
)

for target in "${targets[@]}"; do
  base="${target%.mmd}"
  src="assets/diagrams/${base}.mmd"
  pdf="assets/figures/${base}.pdf"
  png="assets/figures/${base}.png"

  if [[ ! -f "$src" ]]; then
    echo "Missing Mermaid source: $src" >&2
    exit 1
  fi

  has_icons=false
  if rg -q "@\\{ *icon:" "$src"; then
    has_icons=true
  fi

  render_src="$src"
  if rg -q "@\\{ *img:" "$src"; then
    tmp_src="$(mktemp "${TMPDIR:-/tmp}/${base}.XXXXXX.mmd")"
    cleanup_files="$cleanup_files $tmp_src"
    cp "$src" "$tmp_src"
    while IFS= read -r image_path; do
      image_file="${ROOT}/${image_path}"
      if [[ ! -f "$image_file" ]]; then
        echo "Missing Mermaid image asset: $image_path" >&2
        exit 1
      fi

      case "$image_path" in
        *.svg) mime_type="image/svg+xml" ;;
        *.png) mime_type="image/png" ;;
        *.jpg | *.jpeg) mime_type="image/jpeg" ;;
        *.webp) mime_type="image/webp" ;;
        *)
          echo "Unsupported Mermaid image asset type: $image_path" >&2
          exit 1
          ;;
      esac

      data_uri="data:${mime_type};base64,$(base64 < "$image_file" | tr -d '\n')"
      IMAGE_PATH="$image_path" DATA_URI="$data_uri" perl -0pi -e 's/\Q$ENV{IMAGE_PATH}\E/$ENV{DATA_URI}/g' "$tmp_src"
    done < <(rg -o 'img: "assets/[^"]+"' "$src" | sed -E 's/^img: "([^"]+)"/\1/' | sort -u)
    render_src="$tmp_src"
  fi

  echo "==> Render $src -> $pdf"
  if [[ "$has_icons" == true ]]; then
    pnpm exec mmdc -i "$render_src" -o "$pdf" -b white --pdfFit -w 1800 -H 1200 --iconPacks "${ICON_PACKS[@]}"
  else
    pnpm exec mmdc -i "$render_src" -o "$pdf" -b white --pdfFit -w 1800 -H 1200
  fi

  echo "==> Render $src -> $png"
  if [[ "$has_icons" == true ]]; then
    pnpm exec mmdc -i "$render_src" -o "$png" -b white -w 1800 -H 1200 --iconPacks "${ICON_PACKS[@]}"
  else
    pnpm exec mmdc -i "$render_src" -o "$png" -b white -w 1800 -H 1200
  fi
done

echo "OK: Chapter 4 Mermaid diagrams rendered."
