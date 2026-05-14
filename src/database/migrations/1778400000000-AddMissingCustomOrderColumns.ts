import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingCustomOrderColumns1778400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE custom_orders
        ADD COLUMN IF NOT EXISTS agreed_price       NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS counts_for_incentive BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS custom_commission  NUMERIC(12,2)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE custom_orders
        DROP COLUMN IF EXISTS agreed_price,
        DROP COLUMN IF EXISTS counts_for_incentive,
        DROP COLUMN IF EXISTS custom_commission
    `);
  }
}
