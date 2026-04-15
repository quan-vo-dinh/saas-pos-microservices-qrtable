#!/usr/bin/env bash
set -euo pipefail

KEYCLOAK_HOST="${KEYCLOAK_HOST:-http://localhost:8180}"
KEYCLOAK_ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-qrtable}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-qrtable-bff}"
KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-change-me}"
KEYCLOAK_MASTER_SSL_REQUIRED="${KEYCLOAK_MASTER_SSL_REQUIRED:-none}"
KEYCLOAK_REALM_SSL_REQUIRED="${KEYCLOAK_REALM_SSL_REQUIRED:-none}"
AUTH_BOOTSTRAP_USERS_FILE="${AUTH_BOOTSTRAP_USERS_FILE:-tools/auth-bootstrap-users.json}"

required_cmds=(curl jq)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

get_admin_token() {
  curl -sS -X POST "${KEYCLOAK_HOST}/realms/master/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=admin-cli" \
    --data-urlencode "username=${KEYCLOAK_ADMIN_USER}" \
    --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" | jq -r '.access_token'
}

ADMIN_TOKEN="$(get_admin_token)"
if [[ -z "${ADMIN_TOKEN}" || "${ADMIN_TOKEN}" == "null" ]]; then
  echo "Unable to get Keycloak admin token"
  exit 1
fi

if [[ ! -f "${AUTH_BOOTSTRAP_USERS_FILE}" ]]; then
  echo "Auth bootstrap users file not found: ${AUTH_BOOTSTRAP_USERS_FILE}"
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${ADMIN_TOKEN}")
json_header=(-H 'Content-Type: application/json')

echo "Ensuring master realm sslRequired=${KEYCLOAK_MASTER_SSL_REQUIRED}"
curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/master" \
  "${auth_header[@]}" "${json_header[@]}" \
  -d "{\"realm\":\"master\",\"sslRequired\":\"${KEYCLOAK_MASTER_SSL_REQUIRED}\"}" >/dev/null

realm_exists_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
if [[ "${realm_exists_code}" == "404" ]]; then
  echo "Creating realm: ${KEYCLOAK_REALM}"
  curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "{\"realm\":\"${KEYCLOAK_REALM}\",\"enabled\":true,\"sslRequired\":\"${KEYCLOAK_REALM_SSL_REQUIRED}\"}" >/dev/null
else
  echo "Realm already exists: ${KEYCLOAK_REALM}"
fi

echo "Ensuring realm ${KEYCLOAK_REALM} sslRequired=${KEYCLOAK_REALM_SSL_REQUIRED}"
curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" \
  "${auth_header[@]}" "${json_header[@]}" \
  -d "{\"realm\":\"${KEYCLOAK_REALM}\",\"sslRequired\":\"${KEYCLOAK_REALM_SSL_REQUIRED}\"}" >/dev/null

client_id_internal="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}" "${auth_header[@]}" | jq -r '.[0].id // empty')"
if [[ -z "${client_id_internal}" ]]; then
  echo "Creating client: ${KEYCLOAK_CLIENT_ID}"
  curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "{\"clientId\":\"${KEYCLOAK_CLIENT_ID}\",\"enabled\":true,\"publicClient\":false,\"protocol\":\"openid-connect\",\"serviceAccountsEnabled\":true,\"directAccessGrantsEnabled\":true,\"standardFlowEnabled\":true,\"secret\":\"${KEYCLOAK_CLIENT_SECRET}\"}" >/dev/null

  client_id_internal="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}" "${auth_header[@]}" | jq -r '.[0].id // empty')"
fi

if [[ -z "${client_id_internal}" ]]; then
  echo "Unable to resolve Keycloak internal client id"
  exit 1
fi

realm_management_client_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=realm-management" "${auth_header[@]}" | jq -r '.[0].id // empty')"
service_account_user_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/service-account-user" "${auth_header[@]}" | jq -r '.id // empty')"

if [[ -z "${realm_management_client_id}" || -z "${service_account_user_id}" ]]; then
  echo "Unable to resolve realm-management client or service account user"
  exit 1
fi

required_realm_mgmt_roles=(manage-users view-users query-users)
for role in "${required_realm_mgmt_roles[@]}"; do
  role_payload="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${realm_management_client_id}/roles/${role}" "${auth_header[@]}")"
  has_role="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${service_account_user_id}/role-mappings/clients/${realm_management_client_id}" "${auth_header[@]}" | jq -e ".[] | select(.name == \"${role}\")" >/dev/null 2>&1; echo $?)"

  if [[ "${has_role}" != "0" ]]; then
    echo "Assigning realm-management role to service account: ${role}"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${service_account_user_id}/role-mappings/clients/${realm_management_client_id}" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "[${role_payload}]" >/dev/null
  fi
done

roles=(SUPER_ADMIN OWNER MANAGER WAITER CHEF BARISTA)
for role in "${roles[@]}"; do
  role_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles/${role}" "${auth_header[@]}")"
  if [[ "${role_code}" == "404" ]]; then
    echo "Creating role: ${role}"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "{\"name\":\"${role}\"}" >/dev/null
  fi
done

ensure_user_attribute_mapper() {
  local mapper_name="$1"
  local user_attribute="$2"
  local claim_name="$3"

  local mapper_exists
  mapper_exists="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models" "${auth_header[@]}" | jq -r ".[] | select(.name == \"${mapper_name}\") | .name")"

  if [[ -z "${mapper_exists}" ]]; then
    echo "Creating protocol mapper: ${mapper_name}"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "{\"name\":\"${mapper_name}\",\"protocol\":\"openid-connect\",\"protocolMapper\":\"oidc-usermodel-attribute-mapper\",\"config\":{\"access.token.claim\":\"true\",\"id.token.claim\":\"true\",\"userinfo.token.claim\":\"true\",\"user.attribute\":\"${user_attribute}\",\"claim.name\":\"${claim_name}\",\"jsonType.label\":\"String\"}}" >/dev/null
  fi
}

# Add mappers to BFF client (current client_id_internal)
ensure_user_attribute_mapper "tenant_id-claim" "tenant_id" "tenant_id"
ensure_user_attribute_mapper "sub_role-claim" "sub_role" "sub_role"

# Add same mappers to management-app client so JWT tokens include tenant_id
mgmt_client_internal="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=management-app" "${auth_header[@]}" | jq -r '.[0].id // empty')"
if [[ -n "${mgmt_client_internal}" ]]; then
  saved_client_id="${client_id_internal}"
  client_id_internal="${mgmt_client_internal}"
  ensure_user_attribute_mapper "tenant_id-claim" "tenant_id" "tenant_id"
  ensure_user_attribute_mapper "sub_role-claim" "sub_role" "sub_role"
  client_id_internal="${saved_client_id}"
fi

ensure_user_for_role() {
  local user_id="$1"
  local username="$2"
  local email="$3"
  local first_name="$4"
  local last_name="$5"
  local password="$6"
  local role_name="$7"
  local tenant_id="$8"
  local sub_role="$9"

  local found_user_id
  found_user_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users?username=${username}" "${auth_header[@]}" | jq -r '.[0].id // empty')"

  if [[ -z "${found_user_id}" ]]; then
    echo "Creating user: ${username} (${role_name})"
    local create_payload
    create_payload="$(jq -n \
      --arg id "${user_id}" \
      --arg username "${username}" \
      --arg email "${email}" \
      --arg firstName "${first_name}" \
      --arg lastName "${last_name}" \
      --arg tenantId "${tenant_id}" \
      --arg subRole "${sub_role}" \
      '{id:$id,username:$username,email:$email,enabled:true,emailVerified:true,firstName:$firstName,lastName:$lastName,attributes:{tenant_id:[$tenantId],sub_role:[$subRole]}}')"

    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "${create_payload}" >/dev/null

    found_user_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users?username=${username}" "${auth_header[@]}" | jq -r '.[0].id // empty')"
  fi

  if [[ -z "${found_user_id}" ]]; then
    echo "Unable to resolve user id for ${username}"
    exit 1
  fi

  local update_payload
  update_payload="$(jq -n \
    --arg id "${found_user_id}" \
    --arg username "${username}" \
    --arg email "${email}" \
    --arg firstName "${first_name}" \
    --arg lastName "${last_name}" \
    --arg tenantId "${tenant_id}" \
    --arg subRole "${sub_role}" \
    '{id:$id,username:$username,email:$email,enabled:true,emailVerified:true,firstName:$firstName,lastName:$lastName,attributes:{tenant_id:[$tenantId],sub_role:[$subRole]}}')"

  curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${found_user_id}" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "${update_payload}" >/dev/null

  curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${found_user_id}/reset-password" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "{\"type\":\"password\",\"value\":\"${password}\",\"temporary\":false}" >/dev/null

  local role_payload
  role_payload="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles/${role_name}" "${auth_header[@]}")"
  local has_role
  has_role="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${found_user_id}/role-mappings/realm" "${auth_header[@]}" | jq -e ".[] | select(.name == \"${role_name}\")" >/dev/null 2>&1; echo $?)"

  if [[ "${has_role}" != "0" ]]; then
    echo "Assigning role ${role_name} to ${username}"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${found_user_id}/role-mappings/realm" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "[${role_payload}]" >/dev/null
  fi
}

while IFS= read -r user_line; do
  user_id="$(echo "${user_line}" | jq -r '.id')"
  username="$(echo "${user_line}" | jq -r '.username')"
  email="$(echo "${user_line}" | jq -r '.email')"
  first_name="$(echo "${user_line}" | jq -r '.firstName')"
  last_name="$(echo "${user_line}" | jq -r '.lastName')"
  password="$(echo "${user_line}" | jq -r '.password')"
  role_name="$(echo "${user_line}" | jq -r '.role')"
  tenant_id="$(echo "${user_line}" | jq -r '.tenantId')"
  sub_role="$(echo "${user_line}" | jq -r '.subRole')"

  ensure_user_for_role "${user_id}" "${username}" "${email}" "${first_name}" "${last_name}" "${password}" "${role_name}" "${tenant_id}" "${sub_role}"
done < <(jq -c '.[]' "${AUTH_BOOTSTRAP_USERS_FILE}")

if command -v node >/dev/null 2>&1; then
  if [[ -n "${MONGODB_URI:-}" || -n "${MONGO_DB_NAME:-}" || -n "${MONGODB_DB_NAME:-}" ]]; then
    echo "Syncing internal users to MongoDB from ${AUTH_BOOTSTRAP_USERS_FILE}"
    node tools/sync-auth-users.js "${AUTH_BOOTSTRAP_USERS_FILE}"
  else
    echo "Skip MongoDB sync: set MONGODB_URI and MONGO_DB_NAME (or MONGODB_DB_NAME) to enable internal user sync"
  fi
else
  echo "Skip MongoDB sync: node command is not available"
fi

echo "Keycloak bootstrap completed for realm ${KEYCLOAK_REALM}."
