import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockReservations1781971200000 implements MigrationInterface {
  name = 'AddStockReservations1781971200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock_reservations" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"created_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"tenant_id" character varying(64) NOT NULL, ` +
        `"order_id" uuid NOT NULL, ` +
        `"reservation_key" character varying(128) NOT NULL, ` +
        `"request_hash" character(64) NOT NULL, ` +
        `"version" integer NOT NULL DEFAULT '0', ` +
        `"state" character varying(20) NOT NULL DEFAULT 'RELEASED', ` +
        `"deduct_result" jsonb, ` +
        `"release_result" jsonb, ` +
        `"last_release_key" character varying(128), ` +
        `"released_at" TIMESTAMP, ` +
        `CONSTRAINT "CHK_stock_reservations_version" CHECK ("version" >= 0), ` +
        `CONSTRAINT "PK_stock_reservations" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_stock_reservations_tenant_order" ON "stock_reservations" ("tenant_id", "order_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_stock_reservations_tenant_key" ON "stock_reservations" ("tenant_id", "reservation_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_stock_reservations_tenant_key"`);
    await queryRunner.query(`DROP INDEX "public"."uq_stock_reservations_tenant_order"`);
    await queryRunner.query(`DROP TABLE "stock_reservations"`);
  }
}
