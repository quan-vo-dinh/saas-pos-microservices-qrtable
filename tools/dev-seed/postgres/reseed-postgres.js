const { Client } = require('pg');
const { DEV_TENANT } = require('../constants');
const { resetCatalog, seedCatalog } = require('./catalog/seed');
const { assertSplitDatabaseTargets, buildPostgresServiceConfigs } = require('./database-config');
const { resetOrder } = require('./order/seed');
const { resetPayment, seedPaymentSettings } = require('./payment/seed');
const { resetSaas, seedSaas } = require('./saas/seed');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to reseed PostgreSQL without --yes');
  }
}

async function connectClients(configs) {
  const clients = Object.fromEntries(Object.entries(configs).map(([service, config]) => [service, new Client(config)]));
  await Promise.all(Object.values(clients).map((client) => client.connect()));
  return clients;
}

async function reseed(clients) {
  await Promise.all(Object.values(clients).map((client) => client.query('begin')));
  try {
    await resetSaas(clients.saas);
    await seedSaas(clients.saas);
    await resetCatalog(clients.catalog);
    await seedCatalog(clients.catalog);
    await resetOrder(clients.order);
    await resetPayment(clients.payment);
    await seedPaymentSettings(clients.payment);
    await Promise.all(Object.values(clients).map((client) => client.query('commit')));
  } catch (error) {
    await Promise.allSettled(Object.values(clients).map((client) => client.query('rollback')));
    throw error;
  }
}

async function main() {
  requireYes();
  const configs = buildPostgresServiceConfigs();
  assertSplitDatabaseTargets(configs);
  const clients = await connectClients(configs);

  try {
    await reseed(clients);
    const targets = Object.entries(configs)
      .map(([service, config]) => `${service}=${config.database}`)
      .join(', ');
    console.log(`PostgreSQL reseeded for tenant ${DEV_TENANT.id}; ${targets}`);
  } finally {
    await Promise.allSettled(Object.values(clients).map((client) => client.end()));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
