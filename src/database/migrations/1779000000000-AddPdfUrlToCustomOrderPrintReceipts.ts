import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfUrlToCustomOrderPrintReceipts1779000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE custom_order_print_receipts ADD COLUMN pdf_url TEXT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE custom_order_print_receipts DROP COLUMN pdf_url`,
    );
  }
}
