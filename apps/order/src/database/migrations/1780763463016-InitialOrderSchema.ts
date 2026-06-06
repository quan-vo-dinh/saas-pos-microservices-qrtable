import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialOrderSchema1780763463016 implements MigrationInterface {
  name = 'InitialOrderSchema1780763463016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "bills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "session_id" uuid NOT NULL, "order_ids" text NOT NULL DEFAULT '', "subtotal" integer NOT NULL DEFAULT '0', "total" integer NOT NULL DEFAULT '0', "rounding_amount" integer NOT NULL DEFAULT '0', "payment_method" character varying(20), "status" character varying(20) NOT NULL, "closed_at" TIMESTAMP, "paid_at" TIMESTAMP, "payment_id" uuid, CONSTRAINT "PK_a56215dfcb525755ec832cc80b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5fd29e3329e337e57b8c793ca8" ON "bills" ("tenant_id", "session_id") `);
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "order_id" uuid NOT NULL, "menu_item_id" uuid NOT NULL, "menu_item_name" character varying(255) NOT NULL, "menu_item_image_url" character varying(500), "quantity" integer NOT NULL DEFAULT '1', "unit_price" integer NOT NULL DEFAULT '0', "note" character varying(255), "status" character varying(20) NOT NULL, "station" character varying(20), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_130af2b40e6c3d2b7fa6a80254" ON "order_items" ("tenant_id", "order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "table_id" uuid NOT NULL, "table_name" character varying(255) NOT NULL, "session_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "total_amount" integer NOT NULL DEFAULT '0', "idempotency_key" character varying(64) NOT NULL, "notes" text, "confirmed_at" TIMESTAMP, "confirmed_by_user_id" character varying(64), "cancelled_at" TIMESTAMP, "cancelled_by_user_id" character varying(64), "cancel_reason" character varying(255), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_orders_tenant_session_idempotency" ON "orders" ("tenant_id", "session_id", "idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "topic" character varying(120) NOT NULL, "event_type" character varying(120) NOT NULL, "aggregate_id" uuid NOT NULL, "partition_key" character varying(128) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "published_at" TIMESTAMP, "attempt_count" integer NOT NULL DEFAULT '0', "last_error" text, CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc0d2a98103923a41a9aebc384" ON "outbox_events" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "table_id" uuid NOT NULL, "table_name" character varying(255) NOT NULL, "session_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "status" character varying(20) NOT NULL, "note" character varying(500), "acknowledged_at" TIMESTAMP, "acknowledged_by_user_id" character varying(64), "resolved_at" TIMESTAMP, CONSTRAINT "PK_ee60bcd826b7e130bfbd97daf66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8aea8c661a46d0c2651d2a1b6b" ON "service_requests" ("tenant_id", "session_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "table_id" uuid NOT NULL, "table_name" character varying(255) NOT NULL, "status" character varying(20) NOT NULL, "started_at" TIMESTAMP NOT NULL, "last_activity" TIMESTAMP NOT NULL, "closed_at" TIMESTAMP, "order_count" integer NOT NULL DEFAULT '0', "current_bill_id" uuid, "version" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a69b541454b0b36f8f6b356765" ON "sessions" ("tenant_id", "table_id", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_a69b541454b0b36f8f6b356765"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8aea8c661a46d0c2651d2a1b6b"`);
    await queryRunner.query(`DROP TABLE "service_requests"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cc0d2a98103923a41a9aebc384"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_tenant_session_idempotency"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_130af2b40e6c3d2b7fa6a80254"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5fd29e3329e337e57b8c793ca8"`);
    await queryRunner.query(`DROP TABLE "bills"`);
  }
}
