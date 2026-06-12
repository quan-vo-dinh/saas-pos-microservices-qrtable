const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

test('Kafka topic provisioning dry-run uses canonical topic names', () => {
  const output = execFileSync('pnpm', ['kafka:provision:topics', '--', '--dry-run'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      KAFKA_BROKERS: 'kafka:9092',
    },
  });

  assert.match(output, /order\.confirmed/);
  assert.match(output, /order\.status_changed/);
  assert.match(output, /payment\.completed/);
  assert.match(output, /kitchen\.sla_warning/);
  assert.match(output, /tenant\.created/);
});
