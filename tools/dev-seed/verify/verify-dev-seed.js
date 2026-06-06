const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const { DEV_TENANT, SUSPENDED_TENANT } = require('../constants');
const { assertSplitDatabaseTargets, buildPostgresServiceConfigs } = require('../postgres/database-config');

async function verifySaas(client) {
  const tenant = await client.query('select id, slug, name, is_active, status from tenants where id = $1', [
    DEV_TENANT.id,
  ]);
  if (tenant.rowCount !== 1 || tenant.rows[0].slug !== DEV_TENANT.slug || tenant.rows[0].is_active !== true) {
    throw new Error('SaaS tenant seed mismatch');
  }
  if (tenant.rows[0].status !== 'ACTIVE') {
    throw new Error(`SaaS tenant status mismatch: ${tenant.rows[0].status}`);
  }

  const suspended = await client.query(
    'select id, slug, name, is_active, status, suspended_reason from tenants where id = $1',
    [SUSPENDED_TENANT.id],
  );
  if (
    suspended.rowCount !== 1 ||
    suspended.rows[0].slug !== SUSPENDED_TENANT.slug ||
    suspended.rows[0].is_active !== false ||
    suspended.rows[0].status !== 'SUSPENDED' ||
    suspended.rows[0].suspended_reason !== SUSPENDED_TENANT.suspendedReason
  ) {
    throw new Error('SaaS suspended tenant seed mismatch');
  }

  const planCount = await client.query(`select count(*)::int as count from pricing_plans`);
  if (planCount.rows[0].count !== 3) {
    throw new Error(`SaaS pricing plan count mismatch: ${planCount.rows[0].count}`);
  }
}

async function verifyCatalog(client) {
  const expectedMinimums = { areas: 4, categories: 4, menu_items: 7, tables: 5 };
  const allowedTenantIds = [DEV_TENANT.id, SUSPENDED_TENANT.id];

  for (const [table, minimum] of Object.entries(expectedMinimums)) {
    const count = await client.query(`select count(*)::int as count from ${table}`);
    if (count.rows[0].count < minimum) {
      throw new Error(`Catalog ${table} count too low: ${count.rows[0].count}`);
    }

    const bad = await client.query(`select count(*)::int as count from ${table} where tenant_id <> all($1::text[])`, [
      allowedTenantIds,
    ]);
    if (bad.rows[0].count !== 0) {
      throw new Error(`Catalog ${table} has rows outside canonical dev tenants`);
    }

    const suspendedRows = await client.query(`select count(*)::int as count from ${table} where tenant_id = $1`, [
      SUSPENDED_TENANT.id,
    ]);
    if (suspendedRows.rows[0].count < 1) {
      throw new Error(`Catalog ${table} missing suspended tenant fixture row`);
    }
  }
}

async function verifyOrder(client) {
  const counts = await client.query(
    `select
      (select count(*)::int from orders where tenant_id = $1) as orders,
      (select count(*)::int from bills where tenant_id = $1) as bills,
      (select count(*)::int from sessions where tenant_id = $1) as sessions`,
    [DEV_TENANT.id],
  );
  const runtime = counts.rows[0];
  if (runtime.orders < 30 || runtime.bills < 29 || runtime.sessions < 30) {
    throw new Error(`Order dashboard fixture counts are too low: ${JSON.stringify(runtime)}`);
  }

  const suspendedRuntime = await client.query(
    `select
      (select count(*)::int from orders where tenant_id = $1) +
      (select count(*)::int from bills where tenant_id = $1) as total`,
    [SUSPENDED_TENANT.id],
  );
  if (suspendedRuntime.rows[0].total !== 0) {
    throw new Error('Order suspended tenant must not have order/bill demo rows');
  }

  const outbox = await client.query(`select count(*)::int as count from outbox_events`);
  if (outbox.rows[0].count !== 0) {
    throw new Error('Order outbox_events is not empty');
  }
}

async function verifyPayment(client) {
  const payments = await client.query(`select count(*)::int as count from payments where tenant_id = $1`, [
    DEV_TENANT.id,
  ]);
  if (payments.rows[0].count < 28) {
    throw new Error(`Payment dashboard fixture count is too low: ${payments.rows[0].count}`);
  }

  const settings = await client.query(`select count(*)::int as count from tenant_payment_settings`);
  if (settings.rows[0].count !== 2) {
    throw new Error(`Payment settings count mismatch: ${settings.rows[0].count}`);
  }

  const outbox = await client.query(`select count(*)::int as count from outbox_events`);
  if (outbox.rows[0].count !== 0) {
    throw new Error('Payment outbox_events is not empty');
  }
}

async function verifyPostgres() {
  const configs = buildPostgresServiceConfigs();
  assertSplitDatabaseTargets(configs);
  const clients = Object.fromEntries(Object.entries(configs).map(([service, config]) => [service, new Client(config)]));

  await Promise.all(Object.values(clients).map((client) => client.connect()));
  try {
    await verifySaas(clients.saas);
    await verifyCatalog(clients.catalog);
    await verifyOrder(clients.order);
    await verifyPayment(clients.payment);
  } finally {
    await Promise.allSettled(Object.values(clients).map((client) => client.end()));
  }
}

async function verifyMongo() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017';
  const mongoDbName =
    process.env.USER_ACCESS_MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'qrtable_auth';
  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const db = client.db(mongoDbName);
    const roleCount = await db.collection('role').countDocuments();
    const userCount = await db.collection('user').countDocuments();
    if (roleCount !== 6) {
      throw new Error(`Mongo role count mismatch: ${roleCount}`);
    }
    if (userCount !== 6) {
      throw new Error(`Mongo user count mismatch: ${userCount}`);
    }
  } finally {
    await client.close();
  }
}

async function verifyRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
  });
  try {
    const legacyKeys = await redis.keys('*tenant_a*');
    if (legacyKeys.length > 0) {
      throw new Error(`Redis still has legacy tenant_a keys: ${legacyKeys.join(', ')}`);
    }
  } finally {
    await redis.quit();
  }
}

async function verifyKeycloakPasswordGrant() {
  const host = process.env.KEYCLOAK_HOST || 'http://localhost:8180';
  const realm = process.env.KEYCLOAK_REALM || 'qrtable';
  const clientId = process.env.MANAGEMENT_APP_CLIENT_ID || 'management-app';
  const clientSecret = process.env.MANAGEMENT_APP_CLIENT_SECRET || 'RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B';

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username: 'owner.1700000002@gmail.com',
    password: 'owner123',
  });

  const response = await fetch(`${host}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Keycloak password grant failed: ${response.status}`);
  }

  const token = await response.json();
  const payload = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64url').toString('utf8'));
  if (payload.tenant_id !== DEV_TENANT.id) {
    throw new Error(`Keycloak tenant_id mismatch: ${payload.tenant_id}`);
  }
}

async function getKeycloakAdminToken(host) {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: process.env.KEYCLOAK_ADMIN_USER || 'admin',
    password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
  });

  const response = await fetch(`${host}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Keycloak admin token failed: ${response.status}`);
  }

  const token = await response.json();
  return token.access_token;
}

async function verifyKeycloakClients() {
  const host = process.env.KEYCLOAK_HOST || 'http://localhost:8180';
  const realm = process.env.KEYCLOAK_REALM || 'qrtable';
  const adminToken = await getKeycloakAdminToken(host);
  const headers = { Authorization: `Bearer ${adminToken}` };

  const realmResponse = await fetch(`${host}/admin/realms/${realm}`, { headers });
  if (!realmResponse.ok) {
    throw new Error(`Keycloak realm missing: ${realm}`);
  }

  for (const clientId of [
    process.env.KEYCLOAK_CLIENT_ID || 'qrtable-bff',
    process.env.MANAGEMENT_APP_CLIENT_ID || 'management-app',
  ]) {
    const response = await fetch(`${host}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Keycloak client lookup failed for ${clientId}: ${response.status}`);
    }

    const clients = await response.json();
    if (!Array.isArray(clients) || clients.length === 0) {
      throw new Error(`Keycloak client missing: ${clientId}`);
    }
  }
}

async function main() {
  await verifyPostgres();
  await verifyMongo();
  await verifyRedis();
  await verifyKeycloakClients();
  await verifyKeycloakPasswordGrant();
  console.log('Dev seed verification passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
