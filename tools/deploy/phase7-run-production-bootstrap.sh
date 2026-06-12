#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/qrtable/.env.production}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f docker-compose.app.yaml \
  up \
  --force-recreate \
  --abort-on-container-exit \
  --exit-code-from production-bootstrap \
  production-bootstrap
