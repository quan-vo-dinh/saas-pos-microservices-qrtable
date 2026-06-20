import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStockReservationVersion1781971201000 implements MigrationInterface {
  name = 'AddOrderStockReservationVersion1781971201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "stock_reservation_version" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stock_reservation_version"`);
  }
}
