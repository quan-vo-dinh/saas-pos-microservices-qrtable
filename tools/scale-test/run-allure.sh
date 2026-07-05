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

export TS_NODE_PROJECT=tools/scale-test/tsconfig.json
export TYPEORM_HOST="${SCALE_TEST_DB_HOST:-localhost}"
export TYPEORM_PORT="${SCALE_TEST_POSTGRES_HOST_PORT:-15432}"
export TYPEORM_USERNAME="${TYPEORM_USERNAME:-${POSTGRES_USER:-qrtable_app}}"
export TYPEORM_PASSWORD="${TYPEORM_PASSWORD:-${POSTGRES_PASSWORD:-generate_on_server}}"
export REDIS_HOST="${SCALE_TEST_REDIS_HOST:-localhost}"
export REDIS_PORT="${SCALE_TEST_REDIS_HOST_PORT:-16379}"
export SCALE_TEST_ORDER_A_TCP_PORT="${SCALE_TEST_ORDER_A_TCP_PORT:-4201}"
export SCALE_TEST_ORDER_B_TCP_PORT="${SCALE_TEST_ORDER_B_TCP_PORT:-4211}"
export SCALE_TEST_BFF_A_URL="${SCALE_TEST_BFF_A_URL:-http://localhost:${SCALE_TEST_BFF_A_PORT:-4300}}"
export SCALE_TEST_BFF_B_URL="${SCALE_TEST_BFF_B_URL:-http://localhost:${SCALE_TEST_BFF_B_PORT:-4302}}"

rm -rf allure-results allure-report
./node_modules/.bin/playwright test tests/e2e/scale-out-functional.spec.ts --project=chromium
./node_modules/.bin/allure generate allure-results -o allure-report --clean

echo "Allure report generated at ${ROOT_DIR}/allure-report/index.html"
