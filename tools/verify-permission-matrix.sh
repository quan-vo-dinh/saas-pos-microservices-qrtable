#!/usr/bin/env bash
# Verify permission matrix end-to-end: Keycloak login → BFF /authorizer/me → DB → permissions array
# Usage: bash tools/verify-permission-matrix.sh
# Prerequisites: BFF + Authorizer running (pnpm dev:bff-auth), Mongo seeded (Task 8)

set -euo pipefail

BFF_URL="${BFF_URL:-http://localhost:3300/api/v1}"
AUTH_BOOTSTRAP_USERS_FILE="${AUTH_BOOTSTRAP_USERS_FILE:-tools/auth-bootstrap-users.json}"
ROLE_SEED_FILE="${ROLE_SEED_FILE:-apps/user-access/src/seeder/role.json}"

required_cmds=(curl jq)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Missing required command: $cmd"
    exit 1
  fi
done

if [[ ! -f "${AUTH_BOOTSTRAP_USERS_FILE}" ]]; then
  echo "❌ Auth bootstrap users file not found: ${AUTH_BOOTSTRAP_USERS_FILE}"
  exit 1
fi

if [[ ! -f "${ROLE_SEED_FILE}" ]]; then
  echo "❌ Role seed file not found: ${ROLE_SEED_FILE}"
  exit 1
fi

# Pre-flight: BFF reachable?
if ! curl -sS -o /dev/null -w '%{http_code}' "${BFF_URL}/health" 2>/dev/null | grep -q "200\|404"; then
  echo "❌ BFF not reachable at ${BFF_URL}. Start with: pnpm dev:bff-auth"
  exit 1
fi

echo "🔍 Verifying permission matrix end-to-end via ${BFF_URL}"
echo "🔐 Using bootstrap credentials from ${AUTH_BOOTSTRAP_USERS_FILE}"
echo ""

# Format per role: "expected_role:must_have_csv:must_not_have_csv"
# Usernames and passwords are resolved from tools/auth-bootstrap-users.json to avoid
# drifting from the deterministic dev seed.
# Expected permission counts are read from role.json, the canonical role seed.
declare -a TEST_CASES=(
  "SUPER_ADMIN:saas.create,role.create,order.create:"
  "OWNER:catalog.create,user.delete,table.delete,order.cancel_pending,order.cancel_processing:saas.create,role.create"
  "MANAGER:catalog.create,user.update,order.cancel_pending,order.cancel_processing:saas.create,user.delete,role.create"
  "WAITER:order.confirm,order.cancel_pending,payment.confirm_cash,payment.get_history,table.transfer,service_request.acknowledge:order.create,order.cancel_processing,kitchen.get_queue,user.create,catalog.create"
  "CHEF:catalog.get_list,kitchen.get_queue,kitchen.recall:order.confirm,payment.confirm_cash,catalog.create"
  "BARISTA:catalog.get_list,kitchen.update_ticket,kitchen.recall:order.confirm,payment.confirm_cash,catalog.create"
)

bootstrap_field() {
  local role="$1"
  local field="$2"

  jq -r --arg role "${role}" --arg field "${field}" \
    '.[] | select(.role == $role) | .[$field] // empty' \
    "${AUTH_BOOTSTRAP_USERS_FILE}" | head -n 1
}

expected_permission_count() {
  local role="$1"

  jq -r --arg role "${role}" \
    '.data[] | select(.name == $role) | (.permissions | length)' \
    "${ROLE_SEED_FILE}" | head -n 1
}

failures=0

for case_spec in "${TEST_CASES[@]}"; do
  IFS=':' read -r expected_role must_have_csv must_not_have_csv <<< "${case_spec}"
  username="$(bootstrap_field "${expected_role}" "username")"
  password="$(bootstrap_field "${expected_role}" "password")"
  expected_count="$(expected_permission_count "${expected_role}")"

  if [[ -z "${username}" || -z "${password}" ]]; then
    echo "❌ ${expected_role}: missing username/password in ${AUTH_BOOTSTRAP_USERS_FILE}"
    failures=$((failures + 1))
    continue
  fi

  if [[ -z "${expected_count}" || "${expected_count}" == "null" ]]; then
    echo "❌ ${expected_role}: missing role permission count in ${ROLE_SEED_FILE}"
    failures=$((failures + 1))
    continue
  fi

  # Step 1: Login via BFF authorizer
  login_response="$(curl -sS -X POST "${BFF_URL}/authorizer/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\"}")"

  token="$(echo "${login_response}" | jq -r '.data.accessToken // .data.access_token // ""')"

  if [[ -z "${token}" || "${token}" == "null" ]]; then
    echo "❌ ${username}: login failed → response: $(echo "${login_response}" | jq -c '.')"
    failures=$((failures + 1))
    continue
  fi

  # Step 2: GET /authorizer/me
  me_response="$(curl -sS -X GET "${BFF_URL}/authorizer/me" \
    -H "Authorization: Bearer ${token}")"

  permissions_json="$(echo "${me_response}" | jq -c '.data.permissions // []')"

  if [[ "${permissions_json}" == "null" || "${permissions_json}" == "[]" ]]; then
    echo "❌ ${username}: /me returned no permissions → response: $(echo "${me_response}" | jq -c '.')"
    failures=$((failures + 1))
    continue
  fi

  # Step 3: Assert must-have permissions
  case_failed=0
  if ! echo "${me_response}" | jq -e --arg role "${expected_role}" '(.data.roles // []) | index($role) != null' >/dev/null; then
    echo "❌ ${username} (${expected_role}): /me roles did not include '${expected_role}'"
    case_failed=1
  fi

  perm_count="$(echo "${permissions_json}" | jq 'length')"
  if [[ "${perm_count}" != "${expected_count}" ]]; then
    echo "❌ ${username} (${expected_role}): expected ${expected_count} permissions, got ${perm_count}"
    case_failed=1
  fi

  if [[ -n "${must_have_csv}" ]]; then
    IFS=',' read -ra must_have <<< "${must_have_csv}"
    for perm in "${must_have[@]}"; do
      if ! echo "${permissions_json}" | jq -e --arg p "${perm}" 'index($p) != null' >/dev/null; then
        echo "❌ ${username} (${expected_role}): MISSING required permission '${perm}'"
        case_failed=1
      fi
    done
  fi

  # Step 4: Assert must-not-have permissions
  if [[ -n "${must_not_have_csv}" ]]; then
    IFS=',' read -ra must_not_have <<< "${must_not_have_csv}"
    for perm in "${must_not_have[@]}"; do
      if echo "${permissions_json}" | jq -e --arg p "${perm}" 'index($p) != null' >/dev/null; then
        echo "❌ ${username} (${expected_role}): UNEXPECTED permission '${perm}' (should NOT have)"
        case_failed=1
      fi
    done
  fi

  if [[ "${case_failed}" -eq 0 ]]; then
    echo "✅ ${username} (${expected_role}) — ${perm_count} permissions, matrix verified"
  else
    failures=$((failures + 1))
  fi
done

echo ""
if [[ "${failures}" -eq 0 ]]; then
  echo "🎉 All 6 roles verified against permission matrix!"
  exit 0
else
  echo "❌ ${failures} role(s) failed verification. Check role.json + re-seed."
  exit 1
fi
