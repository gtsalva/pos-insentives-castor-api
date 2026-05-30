import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomOrderPrintReceipts1778900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE custom_order_print_receipts (
        print_receipt_id UUID        NOT NULL DEFAULT gen_random_uuid(),
        custom_order_id  UUID        NOT NULL,
        printed_by_id    UUID        NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_copr       PRIMARY KEY (print_receipt_id),
        CONSTRAINT fk_copr_order FOREIGN KEY (custom_order_id) REFERENCES custom_orders(custom_order_id) ON DELETE CASCADE,
        -- users are soft-deleted (deleted_at column); hard delete is prevented at service layer
        CONSTRAINT fk_copr_user  FOREIGN KEY (printed_by_id)   REFERENCES users(user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_copr_custom_order ON custom_order_print_receipts(custom_order_id)`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_copr_custom_order`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_order_print_receipts`);
  }
}
