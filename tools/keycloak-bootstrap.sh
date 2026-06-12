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
# Must match Keycloakify theme id (apps/keycloak-theme/src/kc.gen.tsx → themeNames)
KEYCLOAK_LOGIN_THEME="${KEYCLOAK_LOGIN_THEME:-keycloak-theme}"
KEYCLOAK_CLEAN_REALM="${KEYCLOAK_CLEAN_REALM:-false}"
MANAGEMENT_APP_CLIENT_ID="${MANAGEMENT_APP_CLIENT_ID:-management-app}"
MANAGEMENT_APP_CLIENT_SECRET="${MANAGEMENT_APP_CLIENT_SECRET:-RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B}"
KEYCLOAK_CLIENT_REDIRECT_URIS="${KEYCLOAK_CLIENT_REDIRECT_URIS:-http://localhost:3000/*}"
KEYCLOAK_CLIENT_WEB_ORIGINS="${KEYCLOAK_CLIENT_WEB_ORIGINS:-http://localhost:3000}"
MANAGEMENT_APP_REDIRECT_URIS="${MANAGEMENT_APP_REDIRECT_URIS:-http://localhost:3000/*}"
MANAGEMENT_APP_WEB_ORIGINS="${MANAGEMENT_APP_WEB_ORIGINS:-http://localhost:3000}"
AUTH_BOOTSTRAP_USERS_FILE="${AUTH_BOOTSTRAP_USERS_FILE:-tools/auth-bootstrap-users.json}"

if [[ -z "${AUTH_BOOTSTRAP_DEMO_USERS:-}" ]]; then
  if [[ "${NODE_ENV:-development}" == "production" ]]; then
    AUTH_BOOTSTRAP_DEMO_USERS=false
  else
    AUTH_BOOTSTRAP_DEMO_USERS=true
  fi
fi

required_cmds=(curl jq)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

assert_local_keycloak_host() {
  local parsed_host
  parsed_host="$(node -e "try { console.log(new URL(process.argv[1]).hostname) } catch { process.exit(1) }" "${KEYCLOAK_HOST}")"

  if [[ "${parsed_host}" != "localhost" && "${parsed_host}" != "127.0.0.1" && "${parsed_host}" != "::1" ]]; then
    echo "Refusing to clean non-local Keycloak host: ${KEYCLOAK_HOST}"
    exit 1
  fi
}

if [[ "${KEYCLOAK_CLEAN_REALM}" == "true" ]]; then
  assert_local_keycloak_host
fi

if [[ "${NODE_ENV:-development}" == "production" && "${AUTH_BOOTSTRAP_DEMO_USERS}" == "true" ]]; then
  echo "Refusing to create or reset demo users when NODE_ENV=production"
  exit 1
fi

assert_not_placeholder_secret() {
  local name="$1"
  local value="$2"

  if [[ "${NODE_ENV:-development}" != "production" ]]; then
    return 0
  fi

  case "${value}" in
    "" | "change-me" | "generate_on_server" | "RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B")
      echo "Refusing production Keycloak bootstrap with placeholder ${name}"
      exit 1
      ;;
  esac
}

assert_not_placeholder_secret "KEYCLOAK_CLIENT_SECRET" "${KEYCLOAK_CLIENT_SECRET}"
assert_not_placeholder_secret "MANAGEMENT_APP_CLIENT_SECRET" "${MANAGEMENT_APP_CLIENT_SECRET}"

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

if [[ "${AUTH_BOOTSTRAP_DEMO_USERS}" == "true" && ! -f "${AUTH_BOOTSTRAP_USERS_FILE}" ]]; then
  echo "Auth bootstrap users file not found: ${AUTH_BOOTSTRAP_USERS_FILE}"
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${ADMIN_TOKEN}")
json_header=(-H 'Content-Type: application/json')

get_keycloak_json_array() {
  local url="$1"
  local response

  for _attempt in {1..10}; do
    response="$(curl -sS "${url}" "${auth_header[@]}")"
    if echo "${response}" | jq -e 'type == "array"' >/dev/null 2>&1; then
      echo "${response}"
      return 0
    fi
    sleep 1
  done

  echo "Keycloak API did not return a JSON array after retries: ${url}" >&2
  return 1
}

if [[ "${KEYCLOAK_CLEAN_REALM}" == "true" ]]; then
  clean_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
  if [[ "${clean_code}" == "200" ]]; then
    echo "Deleting realm for clean bootstrap: ${KEYCLOAK_REALM}"
    delete_code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
    if [[ "${delete_code}" != "204" && "${delete_code}" != "200" ]]; then
      echo "Unable to delete realm during clean bootstrap: ${KEYCLOAK_REALM} (HTTP ${delete_code})"
      exit 1
    fi
  elif [[ "${clean_code}" != "404" ]]; then
    echo "Unable to confirm realm before clean bootstrap: ${KEYCLOAK_REALM} (HTTP ${clean_code})"
    exit 1
  fi
fi

echo "Ensuring master realm sslRequired=${KEYCLOAK_MASTER_SSL_REQUIRED}"
master_realm_payload="$(jq -n \
  --arg sslRequired "${KEYCLOAK_MASTER_SSL_REQUIRED}" \
  '{realm:"master",sslRequired:$sslRequired}')"
curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/master" \
  "${auth_header[@]}" "${json_header[@]}" \
  -d "${master_realm_payload}" >/dev/null

realm_exists_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
if [[ "${realm_exists_code}" == "404" ]]; then
  echo "Creating realm: ${KEYCLOAK_REALM}"
  realm_create_payload="$(jq -n \
    --arg realm "${KEYCLOAK_REALM}" \
    --arg sslRequired "${KEYCLOAK_REALM_SSL_REQUIRED}" \
    --arg loginTheme "${KEYCLOAK_LOGIN_THEME}" \
    '{realm:$realm,enabled:true,sslRequired:$sslRequired,loginTheme:$loginTheme,internationalizationEnabled:true,defaultLocale:"vi",supportedLocales:["vi","en"]}')"
  curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "${realm_create_payload}" >/dev/null
else
  echo "Realm already exists: ${KEYCLOAK_REALM}"
fi

echo "Ensuring realm ${KEYCLOAK_REALM} sslRequired=${KEYCLOAK_REALM_SSL_REQUIRED} loginTheme=${KEYCLOAK_LOGIN_THEME}"
realm_current="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
realm_update_merged="$(echo "${realm_current}" | jq \
  --arg ssl "${KEYCLOAK_REALM_SSL_REQUIRED}" \
  --arg loginTheme "${KEYCLOAK_LOGIN_THEME}" \
  '.sslRequired = $ssl | .loginTheme = $loginTheme | .internationalizationEnabled = true | .defaultLocale = "vi" | .supportedLocales = ["vi", "en"]')"
curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" \
  "${auth_header[@]}" "${json_header[@]}" \
  -d "${realm_update_merged}" >/dev/null

ensure_user_profile_attribute() {
  local attribute_name="$1"

  local profile
  profile="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/profile" "${auth_header[@]}")"

  local attribute_exists
  attribute_exists="$(echo "${profile}" | jq -r --arg name "${attribute_name}" '.attributes[]? | select(.name == $name) | .name')"

  if [[ -z "${attribute_exists}" ]]; then
    echo "Creating user profile attribute: ${attribute_name}"
    local updated_profile
    updated_profile="$(echo "${profile}" | jq --arg name "${attribute_name}" '.attributes += [{
      name: $name,
      displayName: $name,
      permissions: { view: ["admin", "user"], edit: ["admin"] },
      multivalued: false
    }]')"

    curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/profile" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "${updated_profile}" >/dev/null
  fi
}

ensure_user_profile_attribute "tenant_id"
ensure_user_profile_attribute "sub_role"

ensure_oidc_client() {
  local client_id="$1"
  local client_secret="$2"
  local public_client="$3"
  local redirect_uris="$4"
  local web_origins="$5"

  local internal_id
  internal_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" "${auth_header[@]}" | jq -r '.[0].id // empty')"

  if [[ -z "${internal_id}" ]]; then
    echo "Creating client: ${client_id}" >&2
    local client_payload
    client_payload="$(jq -n \
      --arg clientId "${client_id}" \
      --arg secret "${client_secret}" \
      --argjson publicClient "${public_client}" \
      '{
        clientId: $clientId,
        enabled: true,
        publicClient: $publicClient,
        protocol: "openid-connect",
        serviceAccountsEnabled: true,
        directAccessGrantsEnabled: true,
        standardFlowEnabled: true,
        secret: $secret,
        redirectUris: [],
        webOrigins: []
      }')"

    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "${client_payload}" >/dev/null

    internal_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" "${auth_header[@]}" | jq -r '.[0].id // empty')"
  fi

  if [[ -z "${internal_id}" ]]; then
    echo "Unable to resolve client after create: ${client_id}" >&2
    return 1
  fi

  local redirect_uris_json
  local web_origins_json
  redirect_uris_json="$(csv_to_json_array "${redirect_uris}")"
  web_origins_json="$(csv_to_json_array "${web_origins}")"

  local client_current
  client_current="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${internal_id}" "${auth_header[@]}")"

  local client_update_merged
  client_update_merged="$(echo "${client_current}" | jq \
    --arg clientId "${client_id}" \
    --arg secret "${client_secret}" \
    --argjson publicClient "${public_client}" \
    --argjson redirectUris "${redirect_uris_json}" \
    --argjson webOrigins "${web_origins_json}" \
    '.clientId = $clientId
      | .enabled = true
      | .publicClient = $publicClient
      | .protocol = "openid-connect"
      | .serviceAccountsEnabled = true
      | .directAccessGrantsEnabled = true
      | .standardFlowEnabled = true
      | .redirectUris = $redirectUris
      | .webOrigins = $webOrigins
      | if $publicClient then del(.secret) else .secret = $secret end')"

  curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${internal_id}" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "${client_update_merged}" >/dev/null

  echo "${internal_id}"
}

csv_to_json_array() {
  local csv_value="$1"
  jq -Rn --arg value "${csv_value}" '$value | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))'
}

client_id_internal="$(ensure_oidc_client "${KEYCLOAK_CLIENT_ID}" "${KEYCLOAK_CLIENT_SECRET}" "false" "${KEYCLOAK_CLIENT_REDIRECT_URIS}" "${KEYCLOAK_CLIENT_WEB_ORIGINS}")"
mgmt_client_internal="$(ensure_oidc_client "${MANAGEMENT_APP_CLIENT_ID}" "${MANAGEMENT_APP_CLIENT_SECRET}" "false" "${MANAGEMENT_APP_REDIRECT_URIS}" "${MANAGEMENT_APP_WEB_ORIGINS}")"

if [[ -z "${client_id_internal}" ]]; then
  echo "Unable to resolve Keycloak internal client id"
  exit 1
fi

if [[ -z "${mgmt_client_internal}" ]]; then
  echo "Unable to resolve Management App internal client id"
  exit 1
fi

realm_management_client_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=realm-management" "${auth_header[@]}" | jq -r '.[0].id // empty')"
service_account_user_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/service-account-user" "${auth_header[@]}" | jq -r '.id // empty')"

if [[ -z "${realm_management_client_id}" || -z "${service_account_user_id}" ]]; then
  echo "Unable to resolve realm-management client or service account user"
  exit 1
fi

required_realm_mgmt_roles=(manage-users view-users query-users view-realm)
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
    role_create_payload="$(jq -n --arg name "${role}" '{name:$name}')"
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/roles" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "${role_create_payload}" >/dev/null
  fi
done

ensure_user_attribute_mapper() {
  local mapper_name="$1"
  local user_attribute="$2"
  local claim_name="$3"

  local mapper_models
  mapper_models="$(get_keycloak_json_array \
    "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models")"

  local mapper_exists
  mapper_exists="$(echo "${mapper_models}" | jq -r --arg name "${mapper_name}" '.[] | select(.name == $name) | .name')"

  if [[ -z "${mapper_exists}" ]]; then
    echo "Creating protocol mapper: ${mapper_name}"
    local mapper_payload
    mapper_payload="$(jq -n \
      --arg name "${mapper_name}" \
      --arg userAttribute "${user_attribute}" \
      --arg claimName "${claim_name}" \
      '{
        name: $name,
        protocol: "openid-connect",
        protocolMapper: "oidc-usermodel-attribute-mapper",
        config: {
          "access.token.claim": "true",
          "id.token.claim": "true",
          "userinfo.token.claim": "true",
          "user.attribute": $userAttribute,
          "claim.name": $claimName,
          "jsonType.label": "String"
        }
      }')"

    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients/${client_id_internal}/protocol-mappers/models" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "${mapper_payload}" >/dev/null
  fi
}

# Add mappers to BFF client (current client_id_internal)
ensure_user_attribute_mapper "tenant_id-claim" "tenant_id" "tenant_id"
ensure_user_attribute_mapper "sub_role-claim" "sub_role" "sub_role"

# Add same mappers to management-app client so JWT tokens include tenant_id
saved_client_id="${client_id_internal}"
client_id_internal="${mgmt_client_internal}"
ensure_user_attribute_mapper "tenant_id-claim" "tenant_id" "tenant_id"
ensure_user_attribute_mapper "sub_role-claim" "sub_role" "sub_role"
client_id_internal="${saved_client_id}"

if [[ "${AUTH_BOOTSTRAP_DEMO_USERS}" == "true" ]]; then
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

  local password_payload
  password_payload="$(jq -n --arg value "${password}" '{type:"password",value:$value,temporary:false}')"

  curl -sS -X PUT "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/users/${found_user_id}/reset-password" \
    "${auth_header[@]}" "${json_header[@]}" \
    -d "${password_payload}" >/dev/null

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
  if [[ -n "${MONGODB_URI:-}" || -n "${USER_ACCESS_MONGO_DB_NAME:-}" || -n "${MONGO_DB_NAME:-}" || -n "${MONGODB_DB_NAME:-}" ]]; then
    echo "Syncing internal users to MongoDB from ${AUTH_BOOTSTRAP_USERS_FILE}"
    node tools/sync-auth-users.js "${AUTH_BOOTSTRAP_USERS_FILE}"
  else
    echo "Skip MongoDB sync: set MONGODB_URI and USER_ACCESS_MONGO_DB_NAME to enable internal user sync"
  fi
else
  echo "Skip MongoDB sync: node command is not available"
fi
else
  echo "Skipping demo user creation/reset; set AUTH_BOOTSTRAP_DEMO_USERS=true outside production to opt in."
fi

echo "Keycloak bootstrap completed for realm ${KEYCLOAK_REALM}."
