#!/usr/bin/env bash
# Phase 4C API smoke — focus on step 6 (disable → enable → login).
# Usage: bash tools/smoke/phase-4c-staff-api-smoke.sh
#
# Prerequisites: BFF, User-Access, Authorizer (TCP 3204), SaaS (TCP 3206), Keycloak, Mongo seeded.

set -euo pipefail

BFF_URL="${BFF_URL:-http://localhost:3300/api/v1}"
OWNER_EMAIL="${PHASE4C_OWNER_EMAIL:-owner.1700000002@gmail.com}"
OWNER_PASSWORD="${PHASE4C_OWNER_PASSWORD:-owner}"
STAFF_EMAIL="${PHASE4C_STAFF_EMAIL:-phase4c.smoke.$(date +%s)@example.com}"
STAFF_PASSWORD="${PHASE4C_STAFF_PASSWORD:-StaffSmoke123!}"

for cmd in curl jq; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing: $cmd"
    exit 1
  }
done

login() {
  local user="$1"
  local pass="$2"
  local response
  response="$(curl -sS -X POST "${BFF_URL}/authorizer/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${user}\",\"password\":\"${pass}\"}")"
  local token
  token="$(echo "${response}" | jq -r '.data.accessToken // .data.access_token // empty')"
  if [[ -z "${token}" ]]; then
    echo "Login failed for ${user}: $(echo "${response}" | jq -c '.')"
    return 1
  fi
  printf '%s' "${token}"
}

echo "Phase 4C API smoke → ${BFF_URL}"
echo "Owner: ${OWNER_EMAIL}"
echo "New staff: ${STAFF_EMAIL}"
echo ""

OWNER_TOKEN="$(login "${OWNER_EMAIL}" "${OWNER_PASSWORD}")" || exit 1
echo "✓ Owner login"

CREATE_BODY="$(jq -n \
  --arg email "${STAFF_EMAIL}" \
  --arg password "${STAFF_PASSWORD}" \
  '{
    email: $email,
    firstName: "Smoke",
    lastName: "Staff",
    roleName: "WAITER",
    password: $password,
    requirePasswordUpdate: false
  }')"

CREATE_RESPONSE="$(curl -sS -w '\n%{http_code}' -X POST "${BFF_URL}/dashboard/staff" \
  -H "Authorization: Bearer ${OWNER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "${CREATE_BODY}")"
CREATE_HTTP="$(echo "${CREATE_RESPONSE}" | tail -n1)"
CREATE_JSON="$(echo "${CREATE_RESPONSE}" | sed '$d')"

if [[ "${CREATE_HTTP}" != "200" && "${CREATE_HTTP}" != "201" ]]; then
  echo "✗ Create staff HTTP ${CREATE_HTTP}: $(echo "${CREATE_JSON}" | jq -c '.')"
  exit 1
fi

STAFF_USER_ID="$(echo "${CREATE_JSON}" | jq -r '.data.userId // .data.user.userId // empty')"
if [[ -z "${STAFF_USER_ID}" ]]; then
  echo "✗ Create staff missing userId: $(echo "${CREATE_JSON}" | jq -c '.')"
  exit 1
fi
echo "✓ Create staff userId=${STAFF_USER_ID}"

STAFF_TOKEN="$(login "${STAFF_EMAIL}" "${STAFF_PASSWORD}")" && echo "✓ Staff login after create" || {
  echo "✗ Staff login after create failed"
  exit 1
}

DISABLE_HTTP="$(curl -sS -o /tmp/phase4c-disable.json -w '%{http_code}' -X POST \
  "${BFF_URL}/dashboard/staff/${STAFF_USER_ID}/disable" \
  -H "Authorization: Bearer ${OWNER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"phase4c smoke disable"}')"
if [[ "${DISABLE_HTTP}" != "200" && "${DISABLE_HTTP}" != "201" ]]; then
  echo "✗ Disable HTTP ${DISABLE_HTTP}: $(cat /tmp/phase4c-disable.json | jq -c '.')"
  exit 1
fi
echo "✓ Disable staff"

if login "${STAFF_EMAIL}" "${STAFF_PASSWORD}" >/dev/null 2>&1; then
  echo "✗ Staff login should fail after disable"
  exit 1
fi
echo "✓ Staff login blocked after disable"

ENABLE_HTTP="$(curl -sS -o /tmp/phase4c-enable.json -w '%{http_code}' -X POST \
  "${BFF_URL}/dashboard/staff/${STAFF_USER_ID}/enable" \
  -H "Authorization: Bearer ${OWNER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"phase4c smoke re-enable"}')"
if [[ "${ENABLE_HTTP}" != "200" && "${ENABLE_HTTP}" != "201" ]]; then
  echo "✗ Enable HTTP ${ENABLE_HTTP}: $(cat /tmp/phase4c-enable.json | jq -c '.')"
  exit 1
fi
echo "✓ Enable staff"

STAFF_TOKEN_AFTER="$(login "${STAFF_EMAIL}" "${STAFF_PASSWORD}")" && echo "✓ Staff login after re-enable (step 6 PASS)" || {
  echo "✗ Staff login after re-enable FAILED (step 6)"
  exit 1
}

echo ""
echo "Phase 4C API smoke: ALL PASS (including step 6)"
