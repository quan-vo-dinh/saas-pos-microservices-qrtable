const { Client } = require('pg');
const { buildPostgresServiceConfigs } = require('../dev-seed/postgres/database-config');

const EXPECTED_TABLES = {
  catalog: ['areas', 'categories', 'menu_items', 'tables', 'typeorm_migrations'],
  order: ['bills', 'order_items', 'orders', 'outbox_events', 'service_requests', 'sessions', 'typeorm_migrations'],
  payment: ['audit_payments', 'outbox_events', 'payments', 'tenant_payment_settings', 'typeorm_migrations'],
  saas: ['outbox_events', 'pricing_plans', 'subscription_invoices', 'subscriptions', 'tenants', 'typeorm_migrations'],
};

function findOwnershipViolations(actualTables, expectedTables) {
  const actual = new Set(actualTables);
  const expected = new Set(expectedTables);

  return {
    missing: expectedTables.filter((table) => !actual.has(table)).sort(),
    unexpected: actualTables.filter((table) => !expected.has(table)).sort(),
  };
}

async function readPublicTables(config) {
  const client = new Client(config);
  await client.connect();
  try {
    const result = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    );
    return result.rows.map((row) => row.table_name);
  } finally {
    await client.end();
  }
}

async function verifyServiceDatabaseOwnership() {
  const configs = buildPostgresServiceConfigs();
  const failures = [];

  for (const [service, expectedTables] of Object.entries(EXPECTED_TABLES)) {
    const actualTables = await readPublicTables(configs[service]);
    const violations = findOwnershipViolations(actualTables, expectedTables);
    if (violations.missing.length || violations.unexpected.length) {
      failures.push(`${service}: ${JSON.stringify(violations)}`);
    }
  }

  if (failures.length) {
    throw new Error(`Database ownership verification failed\n${failures.join('\n')}`);
  }

  console.log('Service database ownership verification passed');
}

if (require.main === module) {
  verifyServiceDatabaseOwnership().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  EXPECTED_TABLES,
  findOwnershipViolations,
  verifyServiceDatabaseOwnership,
};
