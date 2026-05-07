import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomOrdersSchema1778100000000 implements MigrationInterface {
  name = 'CustomOrdersSchema1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."custom_order_status_enum" AS ENUM(
        'DRAFT','SENT','APPROVED','IN_PRODUCTION','DELIVERED','COMPLETED','CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "custom_orders" (
        "custom_order_id"  uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "order_number"     varchar(20)   NOT NULL,
        "status"           "public"."custom_order_status_enum" NOT NULL DEFAULT 'DRAFT',
        "salesperson_id"   uuid          NOT NULL,
        "client_id"        uuid,
        "client_name"      varchar(150),
        "client_phone"     varchar(30),
        "client_email"     varchar(150),
        "notes"            text,
        "client_notes"     text,
        "delivery_date"    date,
        "total"            numeric(12,2) NOT NULL DEFAULT 0,
        "total_paid"       numeric(12,2) NOT NULL DEFAULT 0,
        "supplier_id"      uuid,
        "linked_purchase_order_id" uuid,
        "created_at"       TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_orders" PRIMARY KEY ("custom_order_id"),
        CONSTRAINT "UQ_custom_orders_number" UNIQUE ("order_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "custom_order_items" (
        "custom_order_item_id" uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "custom_order_id"      uuid          NOT NULL,
        "description"          varchar(300)  NOT NULL,
        "quantity"             numeric(10,2) NOT NULL DEFAULT 1,
        "unit_price"           numeric(12,2) NOT NULL,
        "cost_price"           numeric(12,2),
        "notes"                varchar(300),
        "subtotal"             numeric(12,2) NOT NULL,
        CONSTRAINT "PK_custom_order_items" PRIMARY KEY ("custom_order_item_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "custom_order_payments" (
        "custom_order_payment_id" uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "custom_order_id"         uuid          NOT NULL,
        "payment_method"          "public"."sales_payment_method_enum" NOT NULL,
        "amount"                  numeric(12,2) NOT NULL,
        "payment_reference"       varchar(100),
        "received_by_id"          uuid          NOT NULL,
        "notes"                   varchar(300),
        "created_at"              TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_order_payments" PRIMARY KEY ("custom_order_payment_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "custom_orders"
        ADD CONSTRAINT "FK_custom_orders_salesperson"
        FOREIGN KEY ("salesperson_id") REFERENCES "users"("user_id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_orders"
        ADD CONSTRAINT "FK_custom_orders_client"
        FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_orders"
        ADD CONSTRAINT "FK_custom_orders_supplier"
        FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_order_items"
        ADD CONSTRAINT "FK_custom_order_items_order"
        FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("custom_order_id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_order_payments"
        ADD CONSTRAINT "FK_custom_order_payments_order"
        FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("custom_order_id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "custom_order_payments"
        ADD CONSTRAINT "FK_custom_order_payments_received_by"
        FOREIGN KEY ("received_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`CREATE INDEX "IDX_custom_orders_salesperson" ON "custom_orders" ("salesperson_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_orders_status"      ON "custom_orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_order_payments_order" ON "custom_order_payments" ("custom_order_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_order_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."custom_order_status_enum"`);
  }
}
