const assert = require('node:assert/strict');
const test = require('node:test');
const { findOwnershipViolations } = require('./verify-service-database-ownership');

test('accepts an exact service-owned table set', () => {
  assert.deepEqual(
    findOwnershipViolations(
      ['areas', 'categories', 'typeorm_migrations'],
      ['areas', 'categories', 'typeorm_migrations'],
    ),
    { missing: [], unexpected: [] },
  );
});

test('reports missing and foreign tables', () => {
  assert.deepEqual(findOwnershipViolations(['areas', 'payments'], ['areas', 'categories']), {
    missing: ['categories'],
    unexpected: ['payments'],
  });
});
