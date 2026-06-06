const assert = require('node:assert/strict');
const test = require('node:test');
const { assertSplitDatabaseTargets, buildPostgresServiceConfigs } = require('./database-config');

test('uses dedicated service database defaults', () => {
  const configs = buildPostgresServiceConfigs({});

  assert.equal(configs.catalog.database, 'qrtable_catalog');
  assert.equal(configs.order.database, 'qrtable_order');
  assert.equal(configs.payment.database, 'qrtable_payment');
  assert.equal(configs.saas.database, 'qrtable_saas');
});

test('uses dedicated environment overrides without sharing database names', () => {
  const configs = buildPostgresServiceConfigs({
    TYPEORM_HOST: '127.0.0.1',
    TYPEORM_PORT: '5544',
    TYPEORM_USERNAME: 'qrtable',
    TYPEORM_PASSWORD: 'secret',
    CATALOG_TYPEORM_DATABASE: 'catalog_custom',
    ORDER_TYPEORM_DATABASE: 'order_custom',
    PAYMENT_TYPEORM_DATABASE: 'payment_custom',
    SAAS_TYPEORM_DATABASE: 'saas_custom',
  });

  assert.deepEqual(Object.fromEntries(Object.entries(configs).map(([service, config]) => [service, config.database])), {
    catalog: 'catalog_custom',
    order: 'order_custom',
    payment: 'payment_custom',
    saas: 'saas_custom',
  });
  assert.equal(configs.catalog.host, '127.0.0.1');
  assert.equal(configs.catalog.port, 5544);
  assert.equal(configs.catalog.user, 'qrtable');
  assert.equal(configs.catalog.password, 'secret');
});

test('rejects multiple services targeting the same database', () => {
  const configs = buildPostgresServiceConfigs({
    CATALOG_TYPEORM_DATABASE: 'shared',
    ORDER_TYPEORM_DATABASE: 'shared',
  });

  assert.throws(() => assertSplitDatabaseTargets(configs), /must use distinct PostgreSQL databases/);
});
