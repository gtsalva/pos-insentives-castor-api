import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesSchema1777200000000 implements MigrationInterface {
  name = 'SalesSchema1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sales_payment_method_enum" AS ENUM('CASH', 'CARD', 'TRANSFER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_status_enum" AS ENUM('COMPLETED', 'VOIDED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "sales" (
        "sale_id"        uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "sale_number"    varchar       NOT NULL,
        "salesperson_id" uuid          NOT NULL,
        "payment_method" "public"."sales_payment_method_enum" NOT NULL,
        "total"          numeric(10,2) NOT NULL DEFAULT 0,
        "status"         "public"."sales_status_enum" NOT NULL DEFAULT 'COMPLETED',
        "void_reason"    varchar,
        "created_at"     TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales"        PRIMARY KEY ("sale_id"),
        CONSTRAINT "UQ_sales_number" UNIQUE      ("sale_number")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_salesperson" FOREIGN KEY ("salesperson_id") REFERENCES "users"("user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "sale_item_id" uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id"      uuid          NOT NULL,
        "product_id"   uuid          NOT NULL,
        "quantity"     integer       NOT NULL,
        "unit_price"   numeric(10,2) NOT NULL,
        "subtotal"     numeric(10,2) NOT NULL,
        "created_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_items" PRIMARY KEY ("sale_item_id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD CONSTRAINT "FK_sale_items_sale"    FOREIGN KEY ("sale_id")    REFERENCES "sales"("sale_id")       ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD CONSTRAINT "FK_sale_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_sale_items_product"`);
    await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_sale_items_sale"`);
    await queryRunner.query(`DROP TABLE "sale_items"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_salesperson"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sales_payment_method_enum"`);
  }
}
