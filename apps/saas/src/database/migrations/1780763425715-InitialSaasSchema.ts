import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSaasSchema1780763425715 implements MigrationInterface {
  name = 'InitialSaasSchema1780763425715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pricing_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(40) NOT NULL, "name" character varying(120) NOT NULL, "description" text, "billing_period" character varying(20) NOT NULL DEFAULT 'MONTHLY', "price_vnd" integer NOT NULL DEFAULT '0', "max_tables" integer NOT NULL DEFAULT '0', "max_staff" integer NOT NULL DEFAULT '0', "max_orders_per_day" integer NOT NULL DEFAULT '0', "features" jsonb NOT NULL DEFAULT '[]'::jsonb, "is_active" boolean NOT NULL DEFAULT true, "display_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_57aa9837d4777aafc70ba090fb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pricing_plans_active_order" ON "pricing_plans" ("is_active", "display_order") `,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_pricing_plans_code" ON "pricing_plans" ("code") `);
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "topic" character varying(120) NOT NULL, "event_type" character varying(120) NOT NULL, "aggregate_id" uuid NOT NULL, "partition_key" character varying(128) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "published_at" TIMESTAMP WITH TIME ZONE, "attempt_count" integer NOT NULL DEFAULT '0', "last_error" text, CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_outbox_status_created" ON "outbox_events" ("status", "created_at") `);
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "pricing_plan_id" uuid NOT NULL, "plan_code_snapshot" character varying(40) NOT NULL, "price_vnd_snapshot" bigint NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "superseded_by_subscription_id" uuid, "canceled_at" TIMESTAMP WITH TIME ZONE, "canceled_reason" text, "expired_at" TIMESTAMP WITH TIME ZONE, "source" character varying(30) NOT NULL DEFAULT 'ADMIN_ASSIGN', "source_invoice_id" uuid, "created_by_user_id" character varying(64), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_subscriptions_expires_at_active" ON "subscriptions" ("expires_at", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_subscriptions_tenant_status" ON "subscriptions" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "pricing_plan_id" uuid NOT NULL, "plan_code_snapshot" character varying(40) NOT NULL, "amount_vnd" bigint NOT NULL, "billing_period" character varying(20) NOT NULL, "period_starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "period_ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "billing_reference" character varying(32) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "qr_url" text, "qr_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "paid_amount_vnd" bigint, "sepay_transaction_id" bigint, "sepay_reference_code" character varying(120), "sepay_account_number" character varying(64), "sepay_gateway" character varying(80), "sepay_transfer_content" text, "sepay_transaction_date" TIMESTAMP WITH TIME ZONE, "manually_confirmed_by_user_id" character varying(64), "manually_confirmed_at" TIMESTAMP WITH TIME ZONE, "requested_by_user_id" character varying(64) NOT NULL, "expired_at" TIMESTAMP WITH TIME ZONE, "canceled_at" TIMESTAMP WITH TIME ZONE, "canceled_reason" text, CONSTRAINT "PK_7050ae7d81f0f0207b8f1cd2efc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_subscription_invoices_tenant_status" ON "subscription_invoices" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_subscription_invoices_sepay_tx" ON "subscription_invoices" ("sepay_transaction_id") WHERE "sepay_transaction_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_subscription_invoices_billing_ref" ON "subscription_invoices" ("billing_reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(120) NOT NULL, "slug" character varying(120) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "type" character varying(30) NOT NULL DEFAULT 'RESTAURANT', "address" text, "owner_id" uuid, "default_currency" character varying(10) NOT NULL DEFAULT 'VND', "default_locale" character varying(20) NOT NULL DEFAULT 'vi-VN', "operating_modes" text array NOT NULL DEFAULT ARRAY['INSTANT_ORDER','DIGITAL_MENU'], "suspended_at" TIMESTAMP WITH TIME ZONE, "suspended_reason" text, "closed_at" TIMESTAMP WITH TIME ZONE, "closed_reason" text, CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_tenants_status_created_at" ON "tenants" ("status", "created_at") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_tenants_slug" ON "tenants" ("slug") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_tenants_slug"`);
    await queryRunner.query(`DROP INDEX "public"."ix_tenants_status_created_at"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP INDEX "public"."uq_subscription_invoices_billing_ref"`);
    await queryRunner.query(`DROP INDEX "public"."uq_subscription_invoices_sepay_tx"`);
    await queryRunner.query(`DROP INDEX "public"."ix_subscription_invoices_tenant_status"`);
    await queryRunner.query(`DROP TABLE "subscription_invoices"`);
    await queryRunner.query(`DROP INDEX "public"."ix_subscriptions_tenant_status"`);
    await queryRunner.query(`DROP INDEX "public"."ix_subscriptions_expires_at_active"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP INDEX "public"."ix_outbox_status_created"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP INDEX "public"."uq_pricing_plans_code"`);
    await queryRunner.query(`DROP INDEX "public"."ix_pricing_plans_active_order"`);
    await queryRunner.query(`DROP TABLE "pricing_plans"`);
  }
}
