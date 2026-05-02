const { Client } = require('pg');
const { DEV_TENANT } = require('../constants');
const { AREAS, CATEGORIES, MENU_ITEMS, TABLES } = require('./data');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to reseed PostgreSQL without --yes');
  }
}

function assertDevTarget(config) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    throw new Error(`Refusing to reseed PostgreSQL when NODE_ENV=${nodeEnv}`);
  }
  if (!['localhost', '127.0.0.1'].includes(config.host)) {
    throw new Error(`Refusing to reseed non-local PostgreSQL host: ${config.host}`);
  }
}

function pgConfig() {
  return {
    host: process.env.TYPEORM_HOST || 'localhost',
    port: Number(process.env.TYPEORM_PORT || 5432),
    user: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'postgres',
    database: process.env.TYPEORM_DATABASE || 'qrtable',
  };
}

async function truncateTables(client) {
  await client.query(`
    truncate table
      order_items,
      orders,
      bills,
      service_requests,
      sessions,
      outbox_events,
      menu_items,
      tables,
      categories,
      areas,
      tenants
    restart identity cascade
  `);
}

async function seedTenant(client) {
  await client.query(
    `insert into tenants (id, name, slug, is_active, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [DEV_TENANT.id, DEV_TENANT.name, DEV_TENANT.slug],
  );
}

async function seedAreas(client) {
  for (const area of AREAS) {
    await client.query(
      `insert into areas (id, tenant_id, name, sort_order, created_at, updated_at)
       values ($1, $2, $3, $4, now(), now())`,
      [area.id, area.tenantId, area.name, area.sortOrder],
    );
  }
}

async function seedCategories(client) {
  for (const category of CATEGORIES) {
    await client.query(
      `insert into categories (id, tenant_id, name, sort_order, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now())`,
      [category.id, category.tenantId, category.name, category.sortOrder, category.status],
    );
  }
}

async function seedMenuItems(client) {
  for (const item of MENU_ITEMS) {
    await client.query(
      `insert into menu_items
        (id, tenant_id, category_id, name, description, price, image_url, image_public_id, stock, sort_order, status, station, deleted_at, created_at, updated_at)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, null, now(), now())`,
      [
        item.id,
        item.tenantId,
        item.categoryId,
        item.name,
        item.description,
        item.price,
        item.imageUrl,
        item.imagePublicId,
        item.stock,
        item.sortOrder,
        item.status,
        item.station,
      ],
    );
  }
}

async function seedTables(client) {
  for (const table of TABLES) {
    await client.query(
      `insert into tables
        (id, tenant_id, area_id, name, capacity, status, qr_token, session_id, created_at, updated_at)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [
        table.id,
        table.tenantId,
        table.areaId,
        table.name,
        table.capacity,
        table.status,
        table.qrToken,
        table.sessionId,
      ],
    );
  }
}

async function main() {
  requireYes();
  const config = pgConfig();
  assertDevTarget(config);
  const client = new Client(config);

  await client.connect();
  try {
    await client.query('begin');
    await truncateTables(client);
    await seedTenant(client);
    await seedAreas(client);
    await seedCategories(client);
    await seedMenuItems(client);
    await seedTables(client);
    await client.query('commit');
    console.log(`PostgreSQL reseeded for tenant ${DEV_TENANT.id} (${DEV_TENANT.slug})`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
