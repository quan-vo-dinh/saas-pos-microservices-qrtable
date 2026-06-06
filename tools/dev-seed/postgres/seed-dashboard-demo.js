const { Client } = require('pg');
const { DEV_TENANT } = require('../constants');
const {
  DEMO_ID_PREFIX,
  buildPhoVietDashboardFixtures,
  buildPlatformInvoiceFixtures,
} = require('./dashboard-demo-data');
const { assertSplitDatabaseTargets, buildPostgresServiceConfigs } = require('./database-config');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to seed dashboard demo without --yes');
  }
}

async function clearTenantDashboardData(clients, tenantId) {
  await clients.payment.query(`delete from payments where tenant_id = $1`, [tenantId]);
  await clients.order.query(`delete from order_items where tenant_id = $1`, [tenantId]);
  await clients.order.query(`delete from orders where tenant_id = $1`, [tenantId]);
  await clients.order.query(`delete from bills where tenant_id = $1`, [tenantId]);
  await clients.order.query(`delete from service_requests where tenant_id = $1`, [tenantId]);
  await clients.order.query(`delete from sessions where tenant_id = $1`, [tenantId]);
  await clients.saas.query(`delete from subscription_invoices where id::text like $1`, [`${DEMO_ID_PREFIX}%`]);
  await clients.catalog.query(
    `update tables set status = 'available', session_id = null, updated_at = now()
     where tenant_id = $1`,
    [tenantId],
  );
  await clients.catalog.query(
    `update menu_items set status = 'available', updated_at = now()
     where tenant_id = $1 and status = 'out_of_stock'`,
    [tenantId],
  );
}

async function insertSessions(client, rows) {
  for (const row of rows) {
    await client.query(
      `insert into sessions
        (id, tenant_id, table_id, table_name, status, started_at, last_activity, closed_at, order_count, current_bill_id, version, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11,$12)`,
      [
        row.id,
        row.tenantId,
        row.tableId,
        row.tableName,
        row.status,
        row.startedAt,
        row.lastActivity,
        row.closedAt,
        row.orderCount,
        row.currentBillId,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }
}

async function insertOrders(client, rows) {
  for (const row of rows) {
    await client.query(
      `insert into orders
        (id, tenant_id, table_id, table_name, session_id, status, total_amount, idempotency_key, notes,
         confirmed_at, confirmed_by_user_id, cancelled_at, cancelled_by_user_id, cancel_reason, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        row.id,
        row.tenantId,
        row.tableId,
        row.tableName,
        row.sessionId,
        row.status,
        row.totalAmount,
        row.idempotencyKey,
        row.notes,
        row.confirmedAt,
        row.confirmedByUserId,
        row.cancelledAt,
        row.cancelledByUserId,
        row.cancelReason,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }
}

async function insertOrderItems(client, rows) {
  for (const row of rows) {
    await client.query(
      `insert into order_items
        (id, tenant_id, order_id, menu_item_id, menu_item_name, menu_item_image_url, quantity, unit_price, note, status, station, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        row.id,
        row.tenantId,
        row.orderId,
        row.menuItemId,
        row.menuItemName,
        row.menuItemImageUrl,
        row.quantity,
        row.unitPrice,
        row.note,
        row.status,
        row.station,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }
}

async function insertBills(client, rows) {
  for (const row of rows) {
    await client.query(
      `insert into bills
        (id, tenant_id, session_id, order_ids, subtotal, total, rounding_amount, payment_method, status, closed_at, paid_at, payment_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        row.id,
        row.tenantId,
        row.sessionId,
        row.orderIds,
        row.subtotal,
        row.total,
        row.roundingAmount,
        row.paymentMethod,
        row.status,
        row.closedAt,
        row.paidAt,
        row.paymentId,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }
}

async function insertPayments(client, rows) {
  for (const row of rows) {
    await client.query(
      `insert into payments
        (id, tenant_id, bill_id, bill_reference, method, status, raw_total, rounded_total, rounding_delta,
         paid_amount, amount_received, change_amount, paid_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        row.id,
        row.tenantId,
        row.billId,
        row.billReference,
        row.method,
        row.status,
        row.rawTotal,
        row.roundedTotal,
        row.roundingDelta,
        row.paidAmount,
        row.amountReceived,
        row.changeAmount,
        row.paidAt,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }
}

async function applyTablePatches(client, patches) {
  for (const patch of patches) {
    if (patch.kind === 'menu') {
      await client.query(`update menu_items set status = $1, updated_at = now() where id = $2`, [
        patch.status,
        patch.id,
      ]);
      continue;
    }
    await client.query(`update tables set status = $1, session_id = $2, updated_at = now() where id = $3`, [
      patch.status,
      patch.sessionId ?? null,
      patch.id,
    ]);
  }
}

async function seedPlatformInvoices(client, rows) {
  let inserted = 0;
  for (const row of rows) {
    const plan = await client.query(`select id from pricing_plans where code = $1 limit 1`, [row.planCode]);
    if (plan.rowCount !== 1) {
      console.warn(`Skipping platform invoice ${row.billingReference}: plan ${row.planCode} not found`);
      continue;
    }
    await client.query(
      `insert into subscription_invoices
        (id, tenant_id, pricing_plan_id, plan_code_snapshot, amount_vnd, billing_period,
         period_starts_at, period_ends_at, billing_reference, status, qr_expires_at, paid_at, paid_amount_vnd,
         requested_by_user_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (billing_reference) do update set
         status = excluded.status,
         paid_at = excluded.paid_at,
         paid_amount_vnd = excluded.paid_amount_vnd,
         updated_at = excluded.updated_at`,
      [
        row.id,
        row.tenantId,
        plan.rows[0].id,
        row.planCode,
        row.amountVnd,
        row.billingPeriod,
        row.periodStartsAt,
        row.periodEndsAt,
        row.billingReference,
        row.status,
        row.qrExpiresAt,
        row.paidAt,
        row.paidAmountVnd,
        row.requestedByUserId,
        row.createdAt,
        row.updatedAt,
      ],
    );
    inserted += 1;
  }
  return inserted;
}

async function main() {
  requireYes();
  const configs = buildPostgresServiceConfigs();
  assertSplitDatabaseTargets(configs);
  const clients = Object.fromEntries(Object.entries(configs).map(([service, config]) => [service, new Client(config)]));
  const anchorDate = new Date();
  const fixtures = buildPhoVietDashboardFixtures({ anchorDate });
  const platformInvoices = buildPlatformInvoiceFixtures(anchorDate);

  await Promise.all(Object.values(clients).map((client) => client.connect()));
  try {
    await Promise.all(Object.values(clients).map((client) => client.query('begin')));
    const tenant = await clients.saas.query('select id from tenants where id = $1', [DEV_TENANT.id]);
    if (tenant.rowCount !== 1) {
      throw new Error(`Tenant ${DEV_TENANT.slug} (${DEV_TENANT.id}) not found; run reseed-postgres first`);
    }

    await clearTenantDashboardData(clients, DEV_TENANT.id);
    await insertSessions(clients.order, fixtures.sessions);
    await insertOrders(clients.order, fixtures.orders);
    await insertOrderItems(clients.order, fixtures.orderItems);
    await insertBills(clients.order, fixtures.bills);
    await insertPayments(clients.payment, fixtures.payments);
    await applyTablePatches(clients.catalog, fixtures.tablePatches);
    const platformInserted = await seedPlatformInvoices(clients.saas, platformInvoices);
    await Promise.all(Object.values(clients).map((client) => client.query('commit')));

    console.log(
      `Dashboard demo seeded for ${DEV_TENANT.name} (${DEV_TENANT.slug}): ` +
        `${fixtures.expected.paidBillCount} paid bills, ${fixtures.expected.pendingBillCount} pending, ` +
        `${platformInserted}/${platformInvoices.length} platform invoices (anchor ${anchorDate.toISOString()})`,
    );
  } catch (error) {
    await Promise.allSettled(Object.values(clients).map((client) => client.query('rollback')));
    throw error;
  } finally {
    await Promise.allSettled(Object.values(clients).map((client) => client.end()));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
