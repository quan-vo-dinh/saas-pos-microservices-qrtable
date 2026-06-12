#!/usr/bin/env bash
set -euo pipefail

if [[ "${NODE_ENV:-}" != "production" ]]; then
  echo "Refusing production bootstrap when NODE_ENV is not production"
  exit 1
fi

if [[ "${DATABASE_SHARED_FALLBACK_ENABLED:-}" != "false" ]]; then
  echo "Refusing production bootstrap unless DATABASE_SHARED_FALLBACK_ENABLED=false"
  exit 1
fi

echo "Running production database migrations..."
pnpm db:migrate

echo "Showing production migration state..."
pnpm db:migration:show

echo "Verifying service database ownership..."
pnpm db:verify:ownership

echo "Provisioning canonical Kafka topics..."
pnpm kafka:provision:topics

echo "Bootstrapping Keycloak realm, clients, roles, and protocol mappers..."
pnpm auth:bootstrap:keycloak

echo "Production bootstrap completed."
