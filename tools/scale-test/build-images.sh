#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
IMAGE_REPOSITORY="${SCALE_TEST_IMAGE_REPOSITORY:-registry.digitalocean.com/qrtable/qrtable}"
IMAGE_TAG="${SCALE_TEST_IMAGE_TAG:-scale-test}"
BACKEND_APPS=(bff catalog order saas)

cd "${ROOT_DIR}"

for app in "${BACKEND_APPS[@]}"; do
  docker buildx build \
    -f docker/backend.Dockerfile \
    --build-arg APP_NAME="${app}" \
    -t "${IMAGE_REPOSITORY}:${app}-${IMAGE_TAG}" \
    --load \
    .
done

printf 'Built scale-test images with tag: %s\n' "${IMAGE_TAG}"
