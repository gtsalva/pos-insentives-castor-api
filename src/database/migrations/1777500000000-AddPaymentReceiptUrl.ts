import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentReceiptUrl1777500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS payment_receipt_url VARCHAR NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales DROP COLUMN IF EXISTS payment_receipt_url
    `);
  }
}
