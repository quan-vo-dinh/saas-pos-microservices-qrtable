const { DEV_TENANT, SUSPENDED_TENANT } = require('../../constants');

const PRICING_PLANS = [
  {
    code: 'FREE',
    name: 'Miễn phí',
    priceVnd: 0,
    maxTables: 10,
    maxStaff: 5,
    maxOrdersPerDay: 100,
    features: ['basic_pos'],
    displayOrder: 1,
  },
  {
    code: 'BASIC',
    name: 'Cơ bản',
    priceVnd: 299000,
    maxTables: 50,
    maxStaff: 20,
    maxOrdersPerDay: 1000,
    features: ['basic_pos', 'analytics_basic'],
    displayOrder: 2,
  },
  {
    code: 'PREMIUM',
    name: 'Cao cấp',
    priceVnd: 999000,
    maxTables: 500,
    maxStaff: 100,
    maxOrdersPerDay: 10000,
    features: ['basic_pos', 'analytics_basic', 'analytics_advanced', 'priority_support'],
    displayOrder: 3,
  },
];

async function resetSaas(client) {
  await client.query(`
    truncate table subscription_invoices, subscriptions, pricing_plans, outbox_events, tenants
    restart identity cascade
  `);
}

async function seedTenants(client) {
  const tenants = [
    {
      ...DEV_TENANT,
      isActive: true,
      status: 'ACTIVE',
      suspendedAt: null,
      suspendedReason: null,
    },
    {
      ...SUSPENDED_TENANT,
      isActive: false,
      status: 'SUSPENDED',
      suspendedAt: new Date(),
    },
  ];

  for (const tenant of tenants) {
    await client.query(
      `insert into tenants
        (id, name, slug, is_active, status, type, default_currency, default_locale, suspended_at, suspended_reason, created_at, updated_at)
       values
        ($1, $2, $3, $4, $5, 'RESTAURANT', 'VND', 'vi-VN', $6, $7, now(), now())`,
      [tenant.id, tenant.name, tenant.slug, tenant.isActive, tenant.status, tenant.suspendedAt, tenant.suspendedReason],
    );
  }
}

async function seedPricingPlans(client) {
  for (const plan of PRICING_PLANS) {
    await client.query(
      `insert into pricing_plans
        (code, name, billing_period, price_vnd, max_tables, max_staff, max_orders_per_day, features, is_active, display_order, created_at, updated_at)
       values ($1, $2, 'MONTHLY', $3, $4, $5, $6, $7::jsonb, true, $8, now(), now())`,
      [
        plan.code,
        plan.name,
        plan.priceVnd,
        plan.maxTables,
        plan.maxStaff,
        plan.maxOrdersPerDay,
        JSON.stringify(plan.features),
        plan.displayOrder,
      ],
    );
  }
}

async function seedSubscriptions(client) {
  const freePlan = await client.query(`select id, code, price_vnd from pricing_plans where code = 'FREE'`);
  if (freePlan.rowCount !== 1) {
    throw new Error('FREE pricing plan was not seeded');
  }

  for (const tenant of [DEV_TENANT, SUSPENDED_TENANT]) {
    await client.query(
      `insert into subscriptions
        (tenant_id, pricing_plan_id, plan_code_snapshot, price_vnd_snapshot, status, starts_at, source, created_at, updated_at)
       values ($1, $2, $3, $4, 'ACTIVE', now(), 'INITIAL_ONBOARDING', now(), now())`,
      [tenant.id, freePlan.rows[0].id, freePlan.rows[0].code, freePlan.rows[0].price_vnd],
    );
  }
}

async function seedSaas(client) {
  await seedTenants(client);
  await seedPricingPlans(client);
  await seedSubscriptions(client);
}

module.exports = { resetSaas, seedSaas };
