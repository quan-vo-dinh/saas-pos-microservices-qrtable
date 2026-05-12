#!/usr/bin/env bash
set -euo pipefail

: "${BFF_BASE_URL:?BFF_BASE_URL is required}"

curl -fsS "$BFF_BASE_URL/public/plans" >/dev/null
curl -fsS "$BFF_BASE_URL/public/landing-info" >/dev/null

echo "Phase 4B public endpoints are reachable."
