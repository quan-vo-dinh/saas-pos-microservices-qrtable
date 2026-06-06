const { AREAS, CATEGORIES, MENU_ITEMS, TABLES } = require('../data');

async function resetCatalog(client) {
  await client.query(`
    truncate table menu_items, tables, areas, categories
    restart identity cascade
  `);
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

async function seedCatalog(client) {
  await seedAreas(client);
  await seedCategories(client);
  await seedMenuItems(client);
  await seedTables(client);
}

module.exports = { resetCatalog, seedCatalog };
