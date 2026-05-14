import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomOrderCommissionPayments1778600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_order_commission_payments" (
        "commission_payment_id" UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "custom_order_id"       UUID          NOT NULL,
        "amount"                NUMERIC(12,2) NOT NULL,
        "notes"                 VARCHAR(300),
        "paid_by_id"            UUID          NOT NULL,
        "created_at"            TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_order_commission_payments" PRIMARY KEY ("commission_payment_id"),
        CONSTRAINT "FK_commission_payments_order"   FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("custom_order_id") ON DELETE CASCADE,
        CONSTRAINT "FK_commission_payments_paid_by" FOREIGN KEY ("paid_by_id")      REFERENCES "users"("user_id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_order_commission_payments"`);
  }
}
