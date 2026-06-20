const assert = require('node:assert/strict');
const test = require('node:test');
const { EXPECTED_TABLES, findOwnershipViolations } = require('./verify-service-database-ownership');

test('includes Catalog stock reservation state in the ownership contract', () => {
  assert.ok(EXPECTED_TABLES.catalog.includes('stock_reservations'));
});

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
