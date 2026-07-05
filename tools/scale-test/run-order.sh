#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${SCALE_TEST_ENV_FILE:-${ROOT_DIR}/docker/env/.env.scale-test.local}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy docker/env/.env.scale-test.example first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

cd "${ROOT_DIR}"
TS_NODE_PROJECT=tools/scale-test/tsconfig.json \
TYPEORM_HOST="${SCALE_TEST_DB_HOST:-localhost}" \
TYPEORM_PORT="${SCALE_TEST_POSTGRES_HOST_PORT:-15432}" \
TYPEORM_USERNAME="${TYPEORM_USERNAME:-${POSTGRES_USER:-qrtable_app}}" \
TYPEORM_PASSWORD="${TYPEORM_PASSWORD:-${POSTGRES_PASSWORD:-generate_on_server}}" \
REDIS_HOST="${SCALE_TEST_REDIS_HOST:-localhost}" \
REDIS_PORT="${SCALE_TEST_REDIS_HOST_PORT:-16379}" \
SCALE_TEST_ORDER_A_TCP_PORT="${SCALE_TEST_ORDER_A_TCP_PORT:-4201}" \
SCALE_TEST_ORDER_B_TCP_PORT="${SCALE_TEST_ORDER_B_TCP_PORT:-4211}" \
node -r ts-node/register -r tsconfig-paths/register tools/scale-test/order-scale-smoke.ts
