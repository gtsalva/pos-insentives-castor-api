import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceMargins1778800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_settings"
        ADD COLUMN IF NOT EXISTS "min_price_margin"  DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        ADD COLUMN IF NOT EXISTS "sale_price_margin" DECIMAL(5,2) NOT NULL DEFAULT 35.00
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_settings"
        DROP COLUMN IF EXISTS "min_price_margin",
        DROP COLUMN IF EXISTS "sale_price_margin"
    `);
  }
}
