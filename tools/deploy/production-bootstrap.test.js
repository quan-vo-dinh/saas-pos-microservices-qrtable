const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const script = fs.readFileSync(path.resolve('tools/deploy/production-bootstrap.sh'), 'utf8');

test('production bootstrap keeps schema checks before identity and app startup', () => {
  const expectedOrder = [
    'pnpm db:migrate',
    'pnpm db:migration:show',
    'pnpm db:verify:ownership',
    'pnpm kafka:provision:topics',
    'pnpm auth:bootstrap:keycloak',
  ];

  let previousIndex = -1;
  for (const command of expectedOrder) {
    const currentIndex = script.indexOf(command);
    assert.notEqual(currentIndex, -1, `Missing command: ${command}`);
    assert.ok(currentIndex > previousIndex, `${command} should run after the previous bootstrap step`);
    previousIndex = currentIndex;
  }
});

test('production bootstrap does not call destructive development reseed commands', () => {
  assert.doesNotMatch(script, /dev:reseed/);
  assert.doesNotMatch(script, /db:reset:dev/);
});
