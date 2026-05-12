#!/usr/bin/env bash
set -euo pipefail

: "${BFF_BASE_URL:?BFF_BASE_URL is required, e.g. http://localhost:3300/api/v1}"
: "${ACCESS_TOKEN:?ACCESS_TOKEN is required}"
: "${TENANT_ID:?TENANT_ID is required}"

curl_json() {
  local path="$1"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-tenant-id: ${TENANT_ID}" \
    "${BFF_BASE_URL%/}${path}"
}

echo "Checking dashboard subscription..."
curl_json "/dashboard/subscription" >/tmp/phase4b-dashboard-subscription.json
node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync("/tmp/phase4b-dashboard-subscription.json","utf8")); if (!("data" in x)) { throw new Error("subscription response missing data"); }'

echo "Checking dashboard payment settings..."
curl_json "/dashboard/payment-settings" >/tmp/phase4b-dashboard-payment-settings.json
node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync("/tmp/phase4b-dashboard-payment-settings.json","utf8")); if (!("data" in x)) { throw new Error("payment-settings response missing data"); }'

echo "Phase 4B dashboard smoke passed."
