#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANCHORS_DOC="$ROOT_DIR/docs/DOC-CODE-ANCHORS.md"

failures=()

if [[ ! -f "$ANCHORS_DOC" ]]; then
  echo "Missing docs/DOC-CODE-ANCHORS.md"
  exit 1
fi

required_entries=(
  "docs/README.md"
  "docs/DOC-CODE-ANCHORS.md"
  "tools/verify-doc-anchors.sh"
  "docs/guides/frontend-domain-display.md"
  "docs/guides/sepay-configuration-guide-phase3.md"
  "docs/phases/phase-4b-saas-onboarding.md"
  "libs/shared/constants/src/lib/vi-domain-labels.ts"
  "libs/shared/constants/src/lib/saas-wire-types.ts"
  "apps/management-app/src/features/saas/components/badges"
)

for entry in "${required_entries[@]}"; do
  if ! grep -Fq "\`$entry\`" "$ANCHORS_DOC"; then
    failures+=("missing canonical anchor entry: $entry")
  fi
done

anchor_paths=()
while IFS= read -r anchor_path; do
  anchor_paths+=("$anchor_path")
done < <(
  awk '
    {
      line = $0
      while (match(line, /`[^`]+`/)) {
        token = substr(line, RSTART + 1, RLENGTH - 2)
        if (token ~ /^(apps|libs|docs|tools)\// || token == "AGENTS.md" || token == "package.json") {
          print token
        }
        line = substr(line, RSTART + RLENGTH)
      }
    }
  ' "$ANCHORS_DOC" | sort -u
)

if [[ ${#anchor_paths[@]} -eq 0 ]]; then
  failures+=("no path anchors found in docs/DOC-CODE-ANCHORS.md")
fi

for rel_path in "${anchor_paths[@]}"; do
  if [[ "$rel_path" == /* || "$rel_path" == *".."* || "$rel_path" == *"*"* ]]; then
    failures+=("invalid anchor path syntax: $rel_path")
    continue
  fi

  if [[ ! -e "$ROOT_DIR/$rel_path" ]]; then
    failures+=("missing anchor target: $rel_path")
  fi
done

if [[ ${#failures[@]} -gt 0 ]]; then
  printf 'Doc anchor verification failed:\n'
  printf ' - %s\n' "${failures[@]}"
  exit 1
fi

printf 'Verified %d doc anchors.\n' "${#anchor_paths[@]}"
