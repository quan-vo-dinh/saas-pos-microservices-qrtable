# QRTable k6 benchmark scripts

These scripts collect thesis evaluation evidence for the local Phase 6 observability stack. They are representative local benchmarks, not stress tests and not production SLO proof.

## Scripts

| Script | Purpose | Default load |
| --- | --- | --- |
| `01-read-baseline.js` | Readiness, tenant resolve, public menu, expected invalid QR path | Ramp to 15 VUs |
| `02-customer-ordering.js` | Join table session, fetch menu, mutate cart, submit order, list orders | 1 VU, 5 iterations |
| `03-confirm-kds-pulse.js` | Create or find pending order, staff confirm, read KDS queue | 1 VU, 1 iteration |
| `load-test.js` | Compatibility wrapper for `01-read-baseline.js` | Same as read baseline |

## Seed and safety policy

Run mutation benchmarks only after reseeding the local development database:

```bash
pnpm dev:reseed -- --yes
```

Default fixture values:

| Field | Value |
| --- | --- |
| Tenant slug | `pho-viet` |
| Tenant ID | `023772bb-391b-401c-936a-ed7034b69cec` |
| Table | `A02` / `22222222-dddd-4222-8222-222222222222` |
| QR token | `b7d18d28b33eea7b768661247332e78a12acbef84edea4ce3d549a0030344c55` |
| Menu item | `11111111-cccc-4111-8111-111111111111` |

`A01` is reserved by the dashboard demo seed as an occupied table with a pending-payment bill. Use `A02` for mutation benchmarks unless you explicitly override `TABLE_ID`, `TABLE_NAME`, and `QR_TOKEN`.

Do not raise `CUSTOMER_VUS` significantly unless you also provide separate table/session fixtures. Multiple VUs on one table share session and cart state, which makes mutation metrics noisy.

## Local run

Prepare a dated result directory:

```bash
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"
```

Run the read baseline:

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

k6 run \
  --summary-export "$RESULT_DIR/01-read-baseline-summary.json" \
  tests/benchmark/01-read-baseline.js
node tests/benchmark/k6-summary-to-md.js \
  "$RESULT_DIR/01-read-baseline-summary.json" \
  "$RESULT_DIR/01-read-baseline-summary.md"
```

Run customer ordering after reseed:

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

pnpm dev:reseed -- --yes
k6 run \
  --summary-export "$RESULT_DIR/02-customer-ordering-summary.json" \
  tests/benchmark/02-customer-ordering.js
node tests/benchmark/k6-summary-to-md.js \
  "$RESULT_DIR/02-customer-ordering-summary.json" \
  "$RESULT_DIR/02-customer-ordering-summary.md"
```

Run confirm/KDS pulse with real staff JWTs. Use `STAFF_TOKEN` for a role that can confirm orders, such as `WAITER` or `MANAGER`; use `KDS_TOKEN` for a role that can read the target KDS station, such as `CHEF` for `KITCHEN`.

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

get_demo_token() {
  local username="$1"
  local password="$2"

  curl -sS -X POST 'http://localhost:8180/realms/qrtable/protocol/openid-connect/token' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'grant_type=password' \
    --data-urlencode 'client_id=qrtable-bff' \
    --data-urlencode 'client_secret=9UikCZhjajo9syeVe9yvjLjY7l52tWFh' \
    --data-urlencode "username=${username}" \
    --data-urlencode "password=${password}" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); if(!j.access_token){ console.error(JSON.stringify(j)); process.exit(1); } process.stdout.write(j.access_token);})'
}

export STAFF_TOKEN="$(get_demo_token 'waiter.1700000004@gmail.com' 'waiter123')"
export KDS_TOKEN="$(get_demo_token 'chef.1700000005@gmail.com' 'chef123')"

k6 run \
  --summary-export "$RESULT_DIR/03-confirm-kds-pulse-summary.json" \
  tests/benchmark/03-confirm-kds-pulse.js
node tests/benchmark/k6-summary-to-md.js \
  "$RESULT_DIR/03-confirm-kds-pulse-summary.json" \
  "$RESULT_DIR/03-confirm-kds-pulse-summary.md"
```

## Docker Compose run

Default script:

```bash
docker compose -f docker-compose.monitoring.yaml --profile benchmark run --rm k6
```

Pick a script and output file:

```bash
K6_SCRIPT=02-customer-ordering.js \
K6_RESULTS_DIR=/results/2026-06-26-local-k6 \
K6_SUMMARY_FILE=02-customer-ordering-summary.json \
docker compose -f docker-compose.monitoring.yaml --profile benchmark run --rm k6
```

For the confirm/KDS pulse:

```bash
STAFF_TOKEN="$STAFF_TOKEN" \
KDS_TOKEN="$KDS_TOKEN" \
K6_SCRIPT=03-confirm-kds-pulse.js \
K6_RESULTS_DIR=/results/2026-06-26-local-k6 \
K6_SUMMARY_FILE=03-confirm-kds-pulse-summary.json \
docker compose -f docker-compose.monitoring.yaml --profile benchmark run --rm k6
```

## Evidence rules

- Record environment, run time, VU/duration/iteration settings, seed state, and service startup command.
- Keep raw `summary.json` and generated `summary.md` together.
- Human user captures Grafana/Loki/Tempo screenshots. The scripts do not capture or select screenshots.
- Do not write benchmark numbers into the thesis until the real result files exist.
- Do not claim high availability, production readiness, large-scale stress capacity, or microservices superiority from these local runs.
