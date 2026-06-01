#!/usr/bin/env bash
set -euo pipefail

: "${BFF_BASE_URL:?BFF_BASE_URL is required, e.g. http://localhost:3300/api/v1}"
: "${ACCESS_TOKEN:?ACCESS_TOKEN is required (Owner/Manager for tenant routes)}"
: "${TENANT_ID:?TENANT_ID is required (pho-viet internal UUID)}"

curl_json() {
  local path="$1"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-tenant-id: ${TENANT_ID}" \
    "${BFF_BASE_URL%/}${path}"
}

assert_has_data() {
  local file="$1"
  local field="$2"
  node -e "
    const fs = require('fs');
    const body = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    const data = body.data ?? body;
    const value = data[process.argv[2]];
    if (value === undefined || value === null) {
      throw new Error('missing ' + process.argv[2]);
    }
    if (typeof value === 'number' && value <= 0) {
      throw new Error(process.argv[2] + ' must be > 0, got ' + value);
    }
    if (Array.isArray(value) && value.length === 0) {
      throw new Error(process.argv[2] + ' must not be empty');
    }
  " "$file" "$field"
}

echo "Checking tenant revenue report..."
curl_json "/dashboard/reports/revenue?grain=day" >/tmp/phase4d-revenue.json
assert_has_data /tmp/phase4d-revenue.json summary

echo "Checking tenant orders report..."
curl_json "/dashboard/reports/orders?grain=day" >/tmp/phase4d-orders.json
assert_has_data /tmp/phase4d-orders.json summary

echo "Checking tenant tables report..."
curl_json "/dashboard/reports/tables" >/tmp/phase4d-tables.json
assert_has_data /tmp/phase4d-tables.json summary

if [[ -n "${SUPER_ADMIN_TOKEN:-}" ]]; then
  echo "Checking platform analytics..."
  curl -fsS \
    -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
    "${BFF_BASE_URL%/}/admin/analytics/platform?grain=day" >/tmp/phase4d-platform.json
  assert_has_data /tmp/phase4d-platform.json summary
fi

echo "Phase 4D dashboard smoke passed."
