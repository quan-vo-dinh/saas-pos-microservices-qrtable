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

roles=(OWNER MANAGER WAITER CHEF BARISTA)
for role in "${roles[@]}"; do
  role_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles/${role}" "${auth_header[@]}")"
  if [[ "${role_code}" == "404" ]]; then
    echo "Creating role: ${role}"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "{\"name\":\"${role}\"}" >/dev/null
  fi
done

mapper_name='tenant_id-claim'
mapper_exists="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models" "${auth_header[@]}" | jq -r ".[] | select(.name == \"${mapper_name}\") | .name")"

if [[ -z "${mapper_exists}" ]]; then
  echo "Creating protocol mapper: ${mapper_name}"
  curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d '{
      "name": "tenant_id-claim",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-usermodel-attribute-mapper",
      "config": {
        "access.token.claim": "true",
        "id.token.claim": "true",
        "userinfo.token.claim": "true",
        "user.attribute": "tenant_id",
        "claim.name": "tenant_id",
        "jsonType.label": "String"
      }
    }' >/dev/null
fi

echo "Keycloak bootstrap completed for realm ${KEYCLOAK_REALM}."
