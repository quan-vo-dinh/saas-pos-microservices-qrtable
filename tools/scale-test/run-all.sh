#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${QRTABLE_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

"${ROOT_DIR}/tools/scale-test/run-bff.sh"
"${ROOT_DIR}/tools/scale-test/run-order.sh"
