ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'RESTAURANT';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10) NOT NULL DEFAULT 'VND';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_locale VARCHAR(20) NOT NULL DEFAULT 'vi-VN';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS operating_modes TEXT[] NOT NULL DEFAULT ARRAY['INSTANT_ORDER','DIGITAL_MENU'];
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS closed_reason TEXT;

UPDATE tenants SET status = 'SUSPENDED' WHERE is_active = FALSE AND status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  price_vnd INTEGER NOT NULL DEFAULT 0,
  max_tables INTEGER NOT NULL DEFAULT 0,
  max_staff INTEGER NOT NULL DEFAULT 0,
  max_orders_per_day INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pricing_plans (code, name, price_vnd, max_tables, max_staff, max_orders_per_day, features, display_order)
VALUES
  ('FREE', 'Miễn phí', 0, 10, 5, 100, '["basic_pos"]', 1),
  ('BASIC', 'Cơ bản', 299000, 50, 20, 1000, '["basic_pos","analytics_basic"]', 2),
  (
    'PREMIUM',
    'Cao cấp',
    999000,
    500,
    100,
    10000,
    '["basic_pos","analytics_basic","analytics_advanced","priority_support"]',
    3
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_vnd = EXCLUDED.price_vnd,
  max_tables = EXCLUDED.max_tables,
  max_staff = EXCLUDED.max_staff,
  max_orders_per_day = EXCLUDED.max_orders_per_day,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot VARCHAR(40) NOT NULL,
  price_vnd_snapshot BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  superseded_by_subscription_id UUID,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  expired_at TIMESTAMPTZ,
  source VARCHAR(30) NOT NULL DEFAULT 'ADMIN_ASSIGN',
  source_invoice_id UUID,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_subscriptions_tenant_status
  ON subscriptions(tenant_id, status);

CREATE INDEX IF NOT EXISTS ix_subscriptions_expires_at
  ON subscriptions(expires_at)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_per_tenant
  ON subscriptions(tenant_id)
  WHERE status = 'ACTIVE';

INSERT INTO subscriptions (
  tenant_id,
  pricing_plan_id,
  plan_code_snapshot,
  price_vnd_snapshot,
  status,
  starts_at,
  expires_at,
  source
)
SELECT t.id, p.id, p.code, p.price_vnd, 'ACTIVE', t.created_at, NULL, 'INITIAL_ONBOARDING'
FROM tenants t
CROSS JOIN pricing_plans p
WHERE p.code = 'FREE'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.tenant_id = t.id AND s.status = 'ACTIVE'
  );

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot VARCHAR(40) NOT NULL,
  amount_vnd BIGINT NOT NULL,
  billing_period VARCHAR(20) NOT NULL,
  period_starts_at TIMESTAMPTZ NOT NULL,
  period_ends_at TIMESTAMPTZ NOT NULL,
  billing_reference VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  qr_url TEXT,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  paid_amount_vnd BIGINT,
  sepay_transaction_id BIGINT,
  sepay_reference_code VARCHAR(120),
  sepay_account_number VARCHAR(64),
  sepay_gateway VARCHAR(80),
  sepay_transfer_content TEXT,
  sepay_transaction_date TIMESTAMPTZ,
  manually_confirmed_by_user_id UUID,
  manually_confirmed_at TIMESTAMPTZ,
  requested_by_user_id UUID NOT NULL,
  expired_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_invoices_billing_ref
  ON subscription_invoices(billing_reference);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_invoices_sepay_tx
  ON subscription_invoices(sepay_transaction_id)
  WHERE sepay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_tenant_status
  ON subscription_invoices(tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_qr_expires_at
  ON subscription_invoices(qr_expires_at)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  topic VARCHAR(120) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  aggregate_id UUID NOT NULL,
  partition_key VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_outbox_status_created
  ON outbox_events(status, created_at);

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vietqr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  vietqr_bank_name VARCHAR(80),
  vietqr_bank_short_name VARCHAR(20),
  vietqr_bank_bin VARCHAR(20),
  vietqr_account_number VARCHAR(64),
  vietqr_account_holder VARCHAR(120),
  sepay_user_id BIGINT,
  sepay_company_id BIGINT,
  sepay_bank_account_uuid VARCHAR(64),
  sepay_access_token_encrypted TEXT,
  sepay_refresh_token_encrypted TEXT,
  sepay_token_expires_at TIMESTAMPTZ,
  sepay_token_scopes TEXT[],
  sepay_webhook_id VARCHAR(120),
  webhook_secret_encrypted TEXT,
  webhook_verified_at TIMESTAMPTZ,
  connection_status VARCHAR(20) NOT NULL DEFAULT 'NOT_CONNECTED',
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_payment_settings_tenant
  ON tenant_payment_settings(tenant_id);

CREATE INDEX IF NOT EXISTS ix_tenant_payment_settings_account_number
  ON tenant_payment_settings(vietqr_account_number)
  WHERE vietqr_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tenant_payment_settings_sepay_token_expires
  ON tenant_payment_settings(sepay_token_expires_at)
  WHERE connection_status = 'CONNECTED';

INSERT INTO tenant_payment_settings (tenant_id, cash_enabled, vietqr_enabled, connection_status)
SELECT id::text, TRUE, FALSE, 'NOT_CONNECTED'
FROM tenants
ON CONFLICT DO NOTHING;
