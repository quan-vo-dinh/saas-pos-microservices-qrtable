# QRTable Scale-Test Harness

Local harness for functional scale-out checks of BFF and Order.

For screenshot/evidence collection for the thesis report, see
`docs/graduation-thesis-resources/thesis-report/assets/test-evidence/scale-out-functional/README.md`.

## What It Starts

- `bff-a` on `http://localhost:4300`
- `bff-b` on `http://localhost:4302`
- `order-a` TCP on `localhost:4201`
- `order-b` TCP on `localhost:4211`
- `catalog` on `http://localhost:4305` and TCP `localhost:4205`
- `saas` on `http://localhost:4306` and TCP `localhost:4206`
- shared Postgres on `localhost:15432`
- shared Redis on `localhost:16379`
- shared Kafka inside the Compose network

The host app ports intentionally avoid the normal dev stack range (`3300`-`3308`
and `3201`-`3208`) so the scale-out stack can coexist with the main E2E flow.

## First Run

```bash
cp docker/env/.env.scale-test.example docker/env/.env.scale-test.local
bash tools/scale-test/up.sh
bash tools/scale-test/run-all.sh
```

The default `KAFKA_CLUSTER_ID` matches the existing QRTable local infra volume. If you intentionally recreate Kafka data volumes, keep one stable value in `docker/env/.env.scale-test.local` and reuse it across runs.

## Optional: Build Fresh Images

If you need to test the current checkout instead of the existing local `v1.0.0` images:

```bash
SCALE_TEST_IMAGE_TAG=scale-test bash tools/scale-test/build-images.sh
```

Then set this in `docker/env/.env.scale-test.local`:

```bash
SCALE_TEST_IMAGE_TAG=scale-test
```

## Individual Checks

```bash
bash tools/scale-test/run-bff.sh
bash tools/scale-test/run-order.sh
```

The BFF check verifies customer session continuity and Socket.IO Redis Adapter cross-instance delivery.
Set `SCALE_TEST_STAFF_TOKEN` to additionally check staff JWT continuity through both BFF instances.

The Order check verifies cart/session continuity, submit idempotency replay, and concurrent confirm behavior across two Order TCP instances.

## Stop

```bash
bash tools/scale-test/down.sh
```
