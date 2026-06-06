#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ "${1:-}" != "--yes" ]]; then
  echo "Usage: pnpm dev:reseed -- --yes"
  exit 1
fi

export NODE_ENV="${NODE_ENV:-development}"
export MONGODB_URI="${MONGODB_URI:-mongodb://root:password@localhost:27017}"
export USER_ACCESS_MONGO_DB_NAME="${USER_ACCESS_MONGO_DB_NAME:-qrtable_auth}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-${USER_ACCESS_MONGO_DB_NAME}}"
export TYPEORM_HOST="${TYPEORM_HOST:-localhost}"
export TYPEORM_PORT="${TYPEORM_PORT:-5432}"
export TYPEORM_USERNAME="${TYPEORM_USERNAME:-postgres}"
export TYPEORM_PASSWORD="${TYPEORM_PASSWORD:-postgres}"
export CATALOG_TYPEORM_DATABASE="${CATALOG_TYPEORM_DATABASE:-qrtable_catalog}"
export ORDER_TYPEORM_DATABASE="${ORDER_TYPEORM_DATABASE:-qrtable_order}"
export PAYMENT_TYPEORM_DATABASE="${PAYMENT_TYPEORM_DATABASE:-qrtable_payment}"
export SAAS_TYPEORM_DATABASE="${SAAS_TYPEORM_DATABASE:-qrtable_saas}"
export KEYCLOAK_HOST="${KEYCLOAK_HOST:-http://localhost:8180}"
export KEYCLOAK_REALM="${KEYCLOAK_REALM:-qrtable}"
export KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-qrtable-bff}"
export KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-9UikCZhjajo9syeVe9yvjLjY7l52tWFh}"
export MANAGEMENT_APP_CLIENT_ID="${MANAGEMENT_APP_CLIENT_ID:-management-app}"
export MANAGEMENT_APP_CLIENT_SECRET="${MANAGEMENT_APP_CLIENT_SECRET:-RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B}"
export KEYCLOAK_CLEAN_REALM=true

redact_uri() {
  node -e "console.log(process.argv[1].replace(/^(mongodb(?:\\+srv)?:\\/\\/)([^@/?#]+@)/, (_match, scheme) => scheme + '***:***@'))" "$1"
}

echo "Dev reseed targets:"
echo "  PostgreSQL Catalog: ${TYPEORM_USERNAME}@${TYPEORM_HOST}:${TYPEORM_PORT}/${CATALOG_TYPEORM_DATABASE}"
echo "  PostgreSQL Order: ${TYPEORM_USERNAME}@${TYPEORM_HOST}:${TYPEORM_PORT}/${ORDER_TYPEORM_DATABASE}"
echo "  PostgreSQL Payment: ${TYPEORM_USERNAME}@${TYPEORM_HOST}:${TYPEORM_PORT}/${PAYMENT_TYPEORM_DATABASE}"
echo "  PostgreSQL SaaS: ${TYPEORM_USERNAME}@${TYPEORM_HOST}:${TYPEORM_PORT}/${SAAS_TYPEORM_DATABASE}"
echo "  MongoDB User-Access: $(redact_uri "${MONGODB_URI}")/${USER_ACCESS_MONGO_DB_NAME}"
echo "  Keycloak: ${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}"
echo "  Redis: ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}"

pnpm db:reset:dev
pnpm db:migrate
node tools/dev-seed/postgres/reseed-postgres.js --yes
node tools/dev-seed/postgres/seed-dashboard-demo.js --yes
node tools/dev-seed/mongo/reseed-mongo.js --yes
bash tools/keycloak-bootstrap.sh
node tools/dev-seed/flush-redis.js --yes
node tools/dev-seed/verify/verify-dev-seed.js
