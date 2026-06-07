#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-registry.digitalocean.com/qrtable/qrtable}"
IMAGE_TAG="${IMAGE_TAG:-phase7}"
PLATFORM="${PLATFORM:-}" # Empty for native (fast local builds)
BACKEND_APPS=(bff authorizer catalog order kitchen payment saas user-access)

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

echo "All backend images built successfully!"
