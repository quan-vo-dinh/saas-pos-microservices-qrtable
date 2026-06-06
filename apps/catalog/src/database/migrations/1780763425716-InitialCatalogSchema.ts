import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCatalogSchema1780763425716 implements MigrationInterface {
  name = 'InitialCatalogSchema1780763425716';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "name" character varying(120) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_878ecd3be442ec49f5287d5b77a" UNIQUE ("tenant_id", "name"), CONSTRAINT "PK_5110493f6342f34c978c084d0d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b622444ba6aa7b08706f56ff9f" ON "areas" ("tenant_id", "sort_order") `);
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "name" character varying(120) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'active', CONSTRAINT "UQ_f6655064216d359c4dbc5e43c92" UNIQUE ("tenant_id", "name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_27e43f971f8cb655cfa7f3362f" ON "categories" ("tenant_id", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE TABLE "menu_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "category_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "price" numeric(12,2) NOT NULL, "image_url" character varying(500), "image_public_id" character varying(255), "stock" integer NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'available', "station" character varying(20) NOT NULL DEFAULT 'KITCHEN', "deleted_at" TIMESTAMP, CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bce823b4f18c5ee654663f2830" ON "menu_items" ("tenant_id", "status") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fd9ce700f9b563bc99afe75633" ON "menu_items" ("tenant_id", "category_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" character varying(64) NOT NULL, "area_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "capacity" integer NOT NULL DEFAULT '1', "status" character varying(20) NOT NULL DEFAULT 'available', "qr_token" character varying(255) NOT NULL, "session_id" character varying(255), CONSTRAINT "UQ_807c81f2a80c90b8e1a9a62d449" UNIQUE ("tenant_id", "qr_token"), CONSTRAINT "UQ_fb598637cb0cc8c14a3b4a280ab" UNIQUE ("tenant_id", "name"), CONSTRAINT "PK_7cf2aca7af9550742f855d4eb69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_3002fe03fd67b0aaca136674b4" ON "tables" ("tenant_id", "status") `);
    await queryRunner.query(`CREATE INDEX "IDX_6ec45058f99e130ce4282229b1" ON "tables" ("tenant_id", "area_id") `);
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tables" ADD CONSTRAINT "FK_9371712959bf7427eb104769ac6" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tables" DROP CONSTRAINT "FK_9371712959bf7427eb104769ac6"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ec45058f99e130ce4282229b1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3002fe03fd67b0aaca136674b4"`);
    await queryRunner.query(`DROP TABLE "tables"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fd9ce700f9b563bc99afe75633"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bce823b4f18c5ee654663f2830"`);
    await queryRunner.query(`DROP TABLE "menu_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_27e43f971f8cb655cfa7f3362f"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b622444ba6aa7b08706f56ff9f"`);
    await queryRunner.query(`DROP TABLE "areas"`);
  }
}
