import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPaymentSchema1780763425715 implements MigrationInterface {
  name = 'InitialPaymentSchema1780763425715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying(64) NOT NULL, "payment_id" uuid, "refund_id" uuid, "action" character varying(60) NOT NULL, "actor_type" character varying(20) NOT NULL, "actor_id" character varying(128), "reason" text, "meta" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_362e1a424e0e92e58811f07dc2" CHECK ("actor_type" IN ('USER', 'SEPAY', 'SYSTEM')), CONSTRAINT "CHK_41ab500a3612422729f185d8f2" CHECK ("action" IN ('PAYMENT_CREATED', 'CASH_CONFIRMED', 'SEPAY_WEBHOOK_RECEIVED', 'SEPAY_WEBHOOK_DUPLICATE', 'SEPAY_WEBHOOK_UNDERPAID', 'SEPAY_WEBHOOK_AFTER_PAID', 'PAYMENT_COMPLETED')), CONSTRAINT "PK_dc241bcc9c9ae7c5bc7f222bf38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99a20411f4bb03620cb632c533" ON "audit_payments" ("tenant_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fbb663b7d00ba2f197e2f85f5b" ON "audit_payments" ("payment_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying(64) NOT NULL, "topic" character varying(120) NOT NULL, "event_type" character varying(120) NOT NULL, "aggregate_id" uuid NOT NULL, "partition_key" character varying(128) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "published_at" TIMESTAMP, "attempt_count" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc0d2a98103923a41a9aebc384" ON "outbox_events" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying(64) NOT NULL, "bill_id" uuid NOT NULL, "bill_reference" character varying(32) NOT NULL, "method" character varying(20), "status" character varying(30) NOT NULL DEFAULT 'PENDING', "raw_total" integer NOT NULL, "rounded_total" integer NOT NULL, "rounding_delta" integer NOT NULL, "paid_amount" integer, "amount_received" integer, "change_amount" integer, "sepay_transaction_id" integer, "sepay_reference_code" character varying(120), "sepay_gateway" character varying(80), "sepay_account_number" character varying(64), "sepay_transfer_content" text, "sepay_transaction_date" TIMESTAMP, "paid_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_0cf3565152771ea9fe800181a0" CHECK ("change_amount" IS NULL OR "change_amount" >= 0), CONSTRAINT "CHK_5f1550f58e154dcada57835106" CHECK ("amount_received" IS NULL OR "amount_received" >= 0), CONSTRAINT "CHK_6fab51786c00328a2cbb6aaaf1" CHECK ("paid_amount" IS NULL OR "paid_amount" >= 0), CONSTRAINT "CHK_60d45267c01c34e6f8c024ed52" CHECK ("rounded_total" >= 0), CONSTRAINT "CHK_ed1b597f3496048f63c6b45c0e" CHECK ("raw_total" >= 0), CONSTRAINT "CHK_38dc8056c268e165e80dba11c8" CHECK ("method" IS NULL OR "method" IN ('CASH', 'VIETQR')), CONSTRAINT "CHK_9efc6e34b74178dde3b5d78d54" CHECK ("status" IN ('PENDING', 'PAID', 'FAILED')), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e37be5051b435614120c03fea" ON "payments" ("tenant_id", "status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_802a949ea14e2a3df9c37a88bd" ON "payments" ("sepay_transaction_id") WHERE sepay_transaction_id IS NOT NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_75ef7965b622b858ce48e14db2" ON "payments" ("bill_reference") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_48c77e4c3f55103a7775478b25" ON "payments" ("tenant_id", "bill_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_payment_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "cash_enabled" boolean NOT NULL DEFAULT true, "vietqr_enabled" boolean NOT NULL DEFAULT false, "vietqr_bank_name" character varying(100), "vietqr_account_number" character varying(64), "vietqr_account_holder" character varying(160), "sepay_bank_account_uuid" character varying(120), "sepay_access_token_encrypted" text, "sepay_refresh_token_encrypted" text, "sepay_token_expires_at" TIMESTAMP WITH TIME ZONE, "sepay_token_scopes" text array NOT NULL DEFAULT '{}', "sepay_webhook_id" character varying(120), "webhook_secret_encrypted" text, "webhook_verified_at" TIMESTAMP WITH TIME ZONE, "connection_status" character varying(20) NOT NULL DEFAULT 'NOT_CONNECTED', "last_error" text, "last_error_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_98bfe4025758ea1454c8c32b281" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_tenant_payment_settings_tenant" ON "tenant_payment_settings" ("tenant_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_tenant_payment_settings_tenant"`);
    await queryRunner.query(`DROP TABLE "tenant_payment_settings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_48c77e4c3f55103a7775478b25"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_75ef7965b622b858ce48e14db2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_802a949ea14e2a3df9c37a88bd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9e37be5051b435614120c03fea"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cc0d2a98103923a41a9aebc384"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fbb663b7d00ba2f197e2f85f5b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_99a20411f4bb03620cb632c533"`);
    await queryRunner.query(`DROP TABLE "audit_payments"`);
  }
}
