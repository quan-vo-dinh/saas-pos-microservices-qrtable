#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${SCALE_TEST_ENV_FILE:-${ROOT_DIR}/docker/env/.env.scale-test.local}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >&2 <<EOF
Missing scale-test env file: ${ENV_FILE}

Create it with:
  cp docker/env/.env.scale-test.example docker/env/.env.scale-test.local
EOF
  exit 1
fi

cd "${ROOT_DIR}"
docker compose \
  --env-file "${ENV_FILE}" \
  -f docker-compose.infra.yaml \
  -f docker-compose.scale-test.yaml \
  "$@"
