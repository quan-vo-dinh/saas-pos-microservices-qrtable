const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const { DEV_TENANT, SUSPENDED_TENANT } = require('../constants');

async function verifyPostgres() {
  const client = new Client({
    host: process.env.TYPEORM_HOST || 'localhost',
    port: Number(process.env.TYPEORM_PORT || 5432),
    user: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'postgres',
    database: process.env.TYPEORM_DATABASE || 'qrtable',
  });
  await client.connect();
  try {
    const tenant = await client.query('select id, slug, name, is_active, status from tenants where id = $1', [
      DEV_TENANT.id,
    ]);
    if (tenant.rowCount !== 1 || tenant.rows[0].slug !== DEV_TENANT.slug || tenant.rows[0].is_active !== true) {
      throw new Error('PostgreSQL tenant seed mismatch');
    }
    if (tenant.rows[0].status && tenant.rows[0].status !== 'ACTIVE') {
      throw new Error(`PostgreSQL tenant status mismatch: ${tenant.rows[0].status}`);
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
      throw new Error('PostgreSQL suspended tenant seed mismatch');
    }

    const expectedCatalogMinimums = {
      areas: 4,
      categories: 4,
      menu_items: 5,
      tables: 5,
    };

    const allowedTenantIds = [DEV_TENANT.id, SUSPENDED_TENANT.id];
    for (const [table, minimum] of Object.entries(expectedCatalogMinimums)) {
      const count = await client.query(`select count(*)::int as count from ${table}`);
      if (count.rows[0].count < minimum) {
        throw new Error(`PostgreSQL ${table} count too low: ${count.rows[0].count}`);
      }

      const bad = await client.query(`select count(*)::int as count from ${table} where tenant_id <> all($1::uuid[])`, [
        allowedTenantIds,
      ]);
      if (bad.rows[0].count !== 0) {
        throw new Error(`PostgreSQL ${table} has rows outside canonical dev tenants`);
      }

      const suspendedRows = await client.query(`select count(*)::int as count from ${table} where tenant_id = $1`, [
        SUSPENDED_TENANT.id,
      ]);
      if (suspendedRows.rows[0].count < 1) {
        throw new Error(`PostgreSQL ${table} missing suspended tenant fixture row`);
      }
    }

    for (const table of ['orders', 'order_items', 'bills', 'service_requests', 'sessions', 'outbox_events']) {
      const count = await client.query(`select count(*)::int as count from ${table}`);
      if (count.rows[0].count !== 0) {
        throw new Error(`PostgreSQL runtime table ${table} is not empty`);
      }
    }
  } finally {
    await client.end();
  }
}

async function verifyMongo() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017';
  const mongoDbName = process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'qrtable';
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
