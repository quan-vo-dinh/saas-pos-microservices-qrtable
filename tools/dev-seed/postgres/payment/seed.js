const { DEV_TENANT, SUSPENDED_TENANT } = require('../../constants');

async function resetPayment(client) {
  await client.query(`
    truncate table audit_payments, outbox_events, payments, tenant_payment_settings
    restart identity cascade
  `);
}

async function seedPaymentSettings(client) {
  for (const tenant of [DEV_TENANT, SUSPENDED_TENANT]) {
    await client.query(
      `insert into tenant_payment_settings
        (tenant_id, cash_enabled, vietqr_enabled, connection_status, created_at, updated_at)
       values ($1, true, false, 'NOT_CONNECTED', now(), now())`,
      [tenant.id],
    );
  }
}

module.exports = { resetPayment, seedPaymentSettings };
