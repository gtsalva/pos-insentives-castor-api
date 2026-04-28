import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceFieldsToPurchaseItems1777700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_order_items
        ADD COLUMN IF NOT EXISTS min_sale_price NUMERIC(10,2) NULL,
        ADD COLUMN IF NOT EXISTS unit_price      NUMERIC(10,2) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_order_items
        DROP COLUMN IF EXISTS min_sale_price,
        DROP COLUMN IF EXISTS unit_price
    `);
  }
}
