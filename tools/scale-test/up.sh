#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${SCALE_TEST_ENV_FILE:-${ROOT_DIR}/docker/env/.env.scale-test.local}"
read_env_var() {
  awk -F= -v key="$1" '$1 == key { sub(/\r$/, "", $2); print $2; exit }' "${ENV_FILE}" 2>/dev/null || true
}

POSTGRES_PORT="$(read_env_var SCALE_TEST_POSTGRES_HOST_PORT)"
POSTGRES_PORT="${POSTGRES_PORT:-15432}"
POSTGRES_USER="$(read_env_var TYPEORM_USERNAME)"
POSTGRES_USER="${POSTGRES_USER:-$(read_env_var POSTGRES_USER)}"
POSTGRES_USER="${POSTGRES_USER:-qrtable_app}"
POSTGRES_PASSWORD="$(read_env_var TYPEORM_PASSWORD)"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(read_env_var POSTGRES_PASSWORD)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-generate_on_server}"

"${ROOT_DIR}/tools/scale-test/compose.sh" up -d --wait --wait-timeout 180 postgres redis kafka

(
  cd "${ROOT_DIR}"
  NODE_ENV=development \
  TYPEORM_HOST=localhost \
  TYPEORM_PORT="${POSTGRES_PORT}" \
  TYPEORM_USERNAME="${POSTGRES_USER}" \
  TYPEORM_PASSWORD="${POSTGRES_PASSWORD}" \
  node tools/database/provision-service-databases.js --yes

  NODE_ENV=development \
  TYPEORM_HOST=localhost \
  TYPEORM_PORT="${POSTGRES_PORT}" \
  TYPEORM_USERNAME="${POSTGRES_USER}" \
  TYPEORM_PASSWORD="${POSTGRES_PASSWORD}" \
  NX_DAEMON=false \
  ./node_modules/.bin/nx run-many -t migration:run --projects=catalog,order,payment,saas --parallel=1
)

"${ROOT_DIR}/tools/scale-test/compose.sh" up -d --wait --wait-timeout 180 catalog saas order-a order-b bff-a bff-b
"${ROOT_DIR}/tools/scale-test/compose.sh" ps
