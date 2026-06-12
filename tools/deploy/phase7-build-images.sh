#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-registry.digitalocean.com/qrtable/qrtable}"
IMAGE_TAG="${IMAGE_TAG:-phase7}"
PLATFORM="${PLATFORM:-}" # Empty for native (fast local builds)
BACKEND_APPS=(bff authorizer catalog order kitchen payment saas user-access)

# Frontend build-time configuration variables
NEXT_PUBLIC_BFF_URL="${NEXT_PUBLIC_BFF_URL:-https://api.qrtable.vodinhquan.dev/api/v1}"
NEXT_PUBLIC_BFF_BASE_URL="${NEXT_PUBLIC_BFF_BASE_URL:-https://api.qrtable.vodinhquan.dev/api/v1}"
NEXT_PUBLIC_CUSTOMER_PWA_URL="${NEXT_PUBLIC_CUSTOMER_PWA_URL:-https://qr.qrtable.vodinhquan.dev}"
VITE_BFF_URL="${VITE_BFF_URL:-https://api.qrtable.vodinhquan.dev/api/v1}"
VITE_TENANT_ID="${VITE_TENANT_ID:-seed-tenant-fallback}"

if [[ "${PUSH_IMAGES:-false}" == "true" ]]; then
  OUTPUT_ARGS=(--push)
  # Release/CI pushes should default to linux/amd64
  PLATFORM="${PLATFORM:-linux/amd64}"
else
  OUTPUT_ARGS=(--load)
fi

echo "=== QRTable Docker Build Process ==="
echo "Repository: ${IMAGE_REPOSITORY}"
echo "Image Tag:  ${IMAGE_TAG}"
echo "Platform:   ${PLATFORM:-native (host)}"
echo "Action:     ${OUTPUT_ARGS[*]}"
echo "===================================="

# 1. Build Production Tooling Image
echo "Building production tooling image: [tooling]..."
if [[ -n "${PLATFORM}" ]]; then
  docker buildx build \
    --platform "${PLATFORM}" \
    -f docker/tooling.Dockerfile \
    -t "${IMAGE_REPOSITORY}:tooling-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
else
  docker buildx build \
    -f docker/tooling.Dockerfile \
    -t "${IMAGE_REPOSITORY}:tooling-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
fi
echo "Successfully built [tooling]"

# 2. Build Backend Apps
for app in "${BACKEND_APPS[@]}"; do
  echo "Building backend image for service: [${app}]..."
  if [[ -n "${PLATFORM}" ]]; then
    docker buildx build \
      --platform "${PLATFORM}" \
      -f docker/backend.Dockerfile \
      --build-arg APP_NAME="${app}" \
      -t "${IMAGE_REPOSITORY}:${app}-${IMAGE_TAG}" \
      "${OUTPUT_ARGS[@]}" \
      .
  else
    docker buildx build \
      -f docker/backend.Dockerfile \
      --build-arg APP_NAME="${app}" \
      -t "${IMAGE_REPOSITORY}:${app}-${IMAGE_TAG}" \
      "${OUTPUT_ARGS[@]}" \
      .
  fi
  echo "Successfully built [${app}]"
done

# 3. Build Management App
echo "Building frontend image: [management-app]..."
if [[ -n "${PLATFORM}" ]]; then
  docker buildx build \
    --platform "${PLATFORM}" \
    -f docker/management-app.Dockerfile \
    --build-arg NEXT_PUBLIC_BFF_URL="${NEXT_PUBLIC_BFF_URL}" \
    --build-arg NEXT_PUBLIC_BFF_BASE_URL="${NEXT_PUBLIC_BFF_BASE_URL}" \
    --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL="${NEXT_PUBLIC_CUSTOMER_PWA_URL}" \
    -t "${IMAGE_REPOSITORY}:management-app-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
else
  docker buildx build \
    -f docker/management-app.Dockerfile \
    --build-arg NEXT_PUBLIC_BFF_URL="${NEXT_PUBLIC_BFF_URL}" \
    --build-arg NEXT_PUBLIC_BFF_BASE_URL="${NEXT_PUBLIC_BFF_BASE_URL}" \
    --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL="${NEXT_PUBLIC_CUSTOMER_PWA_URL}" \
    -t "${IMAGE_REPOSITORY}:management-app-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
fi
echo "Successfully built [management-app]"

# 4. Build Customer PWA
echo "Building frontend image: [customer-pwa]..."
if [[ -n "${PLATFORM}" ]]; then
  docker buildx build \
    --platform "${PLATFORM}" \
    -f docker/customer-pwa.Dockerfile \
    --build-arg VITE_BFF_URL="${VITE_BFF_URL}" \
    --build-arg VITE_TENANT_ID="${VITE_TENANT_ID}" \
    -t "${IMAGE_REPOSITORY}:customer-pwa-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
else
  docker buildx build \
    -f docker/customer-pwa.Dockerfile \
    --build-arg VITE_BFF_URL="${VITE_BFF_URL}" \
    --build-arg VITE_TENANT_ID="${VITE_TENANT_ID}" \
    -t "${IMAGE_REPOSITORY}:customer-pwa-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
fi
echo "Successfully built [customer-pwa]"

echo "All project images built successfully!"
