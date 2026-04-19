#!/usr/bin/env bash
# Verify permission matrix end-to-end: Keycloak login → BFF /authorizer/me → DB → permissions array
# Usage: bash tools/verify-permission-matrix.sh
# Prerequisites: BFF + Authorizer running (pnpm dev:bff-auth), Mongo seeded (Task 8)

set -euo pipefail

BFF_URL="${BFF_URL:-http://localhost:3300/api/v1}"

required_cmds=(curl jq)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Missing required command: $cmd"
    exit 1
  fi
done

# Pre-flight: BFF reachable?
if ! curl -sS -o /dev/null -w '%{http_code}' "${BFF_URL}/health" 2>/dev/null | grep -q "200\|404"; then
  echo "❌ BFF not reachable at ${BFF_URL}. Start with: pnpm dev:bff-auth"
  exit 1
fi

echo "🔍 Verifying permission matrix end-to-end via ${BFF_URL}"
echo ""

# Format per role: "username:password:expected_role:must_have_csv:must_not_have_csv"
declare -a TEST_CASES=(
  "superadmin.1700000001@gmail.com:superadmin123:SUPER_ADMIN:saas.create,role.create,product.create,order.create:"
  "owner.1700000002@gmail.com:owner:OWNER:catalog.create,user.delete,table.delete,order.cancel:saas.create,role.create,product.create"
  "manager.1700000003@gmail.com:manager123:MANAGER:catalog.create,user.update,order.cancel,payment.refund:saas.create,user.delete,role.create,product.create"
  "waiter.1700000004@gmail.com:waiter123:WAITER:order.confirm,payment.confirm_cash,payment.get_history,table.transfer,service_request.acknowledge:order.create,order.cancel,kitchen.get_queue,user.create,catalog.create"
  "chef.1700000005@gmail.com:chef123:CHEF:catalog.get_list,kitchen.get_queue,kitchen.recall:order.confirm,payment.confirm_cash,catalog.create"
  "barista.1700000006@gmail.com:barista123:BARISTA:catalog.get_list,kitchen.update_ticket,kitchen.recall:order.confirm,payment.confirm_cash,catalog.create"
)

failures=0

for case_spec in "${TEST_CASES[@]}"; do
  IFS=':' read -r username password expected_role must_have_csv must_not_have_csv <<< "${case_spec}"

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
    perm_count="$(echo "${permissions_json}" | jq 'length')"
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
