#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${ENV_FILE:-/opt/qrtable/.env.production}"
PROC_MEMINFO="${PROC_MEMINFO:-/proc/meminfo}"
MIN_MEMORY_KIB="${MIN_MEMORY_KIB:-3670016}"
MIN_SWAP_KIB="${MIN_SWAP_KIB:-2097152}"
MIN_DISK_KIB="${MIN_DISK_KIB:-8388608}"

COMPOSE_FILES=(
  docker-compose.infra.yaml
  docker-compose.app.yaml
  docker-compose.monitoring.yaml
  docker-compose.proxy.yaml
)

fail() {
  echo "Preflight failed: $*" >&2
  exit 1
}

read_env_value() {
  local key="$1"
  local value

  value="$(
    awk -F= -v key="${key}" '
      $1 == key {
        sub(/^[^=]*=/, "")
        sub(/\r$/, "")
        print
        exit
      }
    ' "${ENV_FILE}"
  )"

  if [[ "${value}" =~ ^\".*\"$ || "${value}" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

file_mode() {
  stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"
}

file_owner() {
  stat -c '%U' "$1" 2>/dev/null || stat -f '%Su' "$1"
}

[[ -d "${ROOT_DIR}" ]] || fail "repository root not found: ${ROOT_DIR}"
[[ -f "${ENV_FILE}" ]] || fail "environment file not found: ${ENV_FILE}"
[[ -f "${PROC_MEMINFO}" ]] || fail "memory information not found: ${PROC_MEMINFO}"

if [[ "$(id -u)" == "0" && "${PREFLIGHT_ALLOW_ROOT:-false}" != "true" ]]; then
  fail "run as the non-root deploy user, not root"
fi

for command in awk df docker git grep stat; do
  command -v "${command}" >/dev/null 2>&1 || fail "required command not found: ${command}"
done

for compose_file in "${COMPOSE_FILES[@]}"; do
  [[ -f "${ROOT_DIR}/${compose_file}" ]] || fail "missing Compose file: ${compose_file}"
done

[[ "$(file_mode "${ENV_FILE}")" == "600" ]] || fail "${ENV_FILE} must have mode 0600"
[[ "$(file_owner "${ENV_FILE}")" == "$(id -un)" ]] ||
  fail "${ENV_FILE} must be owned by $(id -un)"

placeholder_lines="$(
  grep -nEv '^[[:space:]]*(#|$)' "${ENV_FILE}" |
    grep -Ei 'generate_on_server|provider_value|your-domain\.example|replace_with|64_hex_chars' || true
)"
[[ -z "${placeholder_lines}" ]] ||
  fail "replace every placeholder value in ${ENV_FILE} before deployment"

image_tag="$(read_env_value IMAGE_TAG)"
[[ "${image_tag}" =~ ^[0-9a-f]{7,40}$ ]] ||
  fail "IMAGE_TAG must be the 7-40 character hexadecimal Git SHA"

current_commit="$(git -C "${ROOT_DIR}" rev-parse HEAD)"
[[ "${current_commit}" == "${image_tag}"* ]] ||
  fail "IMAGE_TAG must match the checked-out Git commit ${current_commit}"

[[ "$(read_env_value NODE_ENV)" == "production" ]] || fail "NODE_ENV must be production"
[[ "$(read_env_value TYPEORM_SYNCHRONIZE)" == "false" ]] ||
  fail "TYPEORM_SYNCHRONIZE must be false"
[[ "$(read_env_value DATABASE_SHARED_FALLBACK_ENABLED)" == "false" ]] ||
  fail "DATABASE_SHARED_FALLBACK_ENABLED must be false"
[[ "$(read_env_value CORS_ORIGINS)" != *"*"* ]] || fail "CORS_ORIGINS must not contain a wildcard"

[[ "$(read_env_value POSTGRES_PASSWORD)" == "$(read_env_value TYPEORM_PASSWORD)" ]] ||
  fail "POSTGRES_PASSWORD and TYPEORM_PASSWORD must match for the shared PostgreSQL role"
[[ "$(read_env_value MANAGEMENT_APP_CLIENT_SECRET)" == "$(read_env_value AUTH_KEYCLOAK_SECRET)" ]] ||
  fail "MANAGEMENT_APP_CLIENT_SECRET and AUTH_KEYCLOAK_SECRET must match"
[[ "$(read_env_value PAYMENT_SECRETS_ENCRYPTION_KEY)" =~ ^[0-9a-fA-F]{64}$ ]] ||
  fail "PAYMENT_SECRETS_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters"
[[ "$(read_env_value GRAFANA_BASIC_AUTH_HASH)" =~ ^\$2[aby]\$ ]] ||
  fail "GRAFANA_BASIC_AUTH_HASH must be a bcrypt hash; single-quote it in the env file"

memory_kib="$(awk '/^MemTotal:/ { print $2 }' "${PROC_MEMINFO}")"
swap_kib="$(awk '/^SwapTotal:/ { print $2 }' "${PROC_MEMINFO}")"
[[ "${memory_kib:-0}" -ge "${MIN_MEMORY_KIB}" ]] ||
  fail "at least 3.5 GiB RAM is required for the 4 GB budget profile"
[[ "${swap_kib:-0}" -ge "${MIN_SWAP_KIB}" ]] ||
  fail "configure at least 2 GiB swap before starting the full stack"

disk_kib="$(df -Pk "${ROOT_DIR}" | awk 'NR == 2 { print $4 }')"
[[ "${disk_kib:-0}" -ge "${MIN_DISK_KIB}" ]] ||
  fail "at least 8 GiB free disk is required before pulling a release"

docker info >/dev/null 2>&1 || fail "Docker daemon is unavailable to $(id -un)"
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is unavailable"

compose_args=()
for compose_file in "${COMPOSE_FILES[@]}"; do
  compose_args+=(-f "${compose_file}")
done

(
  cd "${ROOT_DIR}"
  docker compose --env-file "${ENV_FILE}" "${compose_args[@]}" config -q
)

echo "Phase 7 production preflight passed."
