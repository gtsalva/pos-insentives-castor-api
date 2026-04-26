import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleItemSnapshot1777200000002 implements MigrationInterface {
  name = 'AddSaleItemSnapshot1777200000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sale_items" ADD COLUMN "product_sku" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "sale_items" ADD COLUMN "product_name" character varying NOT NULL DEFAULT ''`);
    // Remove the temporary defaults so future inserts must supply values
    await queryRunner.query(`ALTER TABLE "sale_items" ALTER COLUMN "product_sku" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "sale_items" ALTER COLUMN "product_name" DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN "product_name"`);
    await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN "product_sku"`);
  }
}
