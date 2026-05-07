import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitPayments1778000000000 implements MigrationInterface {
  name = 'SplitPayments1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."sales_payment_method_enum" ADD VALUE IF NOT EXISTS 'VISACUOTAS'`,
    );
    await queryRunner.query(`
      CREATE TABLE "sale_payments" (
        "sale_payment_id"  uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id"          uuid          NOT NULL,
        "payment_method"   "public"."sales_payment_method_enum" NOT NULL,
        "amount"           numeric(10,2) NOT NULL,
        "payment_reference" varchar(100),
        "created_at"       TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_payments" PRIMARY KEY ("sale_payment_id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "sale_payments" ADD CONSTRAINT "FK_sale_payments_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_payments_sale_id" ON "sale_payments" ("sale_id")`,
    );
  }

  // NOTE: PostgreSQL does not support DROP VALUE on an enum.
  // 'VISACUOTAS' will remain in sales_payment_method_enum after rollback.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sale_payments" DROP CONSTRAINT IF EXISTS "FK_sale_payments_sale"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_payments"`);
  }
}
