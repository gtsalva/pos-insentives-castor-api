import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriceFieldsAndSupplier1777340925211 implements MigrationInterface {
    name = 'AddPriceFieldsAndSupplier1777340925211'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_sale_items_sale"`);
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_sale_items_product"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_salesperson"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_client"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inv_movements_product"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inv_movements_user"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_clients_nit_real"`);
        await queryRunner.query(`CREATE TABLE "suppliers" ("supplier_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "contact_name" character varying(100), "phone" character varying(30), "email" character varying(100), "address" character varying, "notes" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a2692f796d16e0a30040860112a" PRIMARY KEY ("supplier_id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_order_items" ("purchase_item_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_order_id" uuid NOT NULL, "product_id" character varying NOT NULL, "product_sku" character varying(50) NOT NULL, "product_name" character varying(150) NOT NULL, "quantity_ordered" integer NOT NULL, "quantity_received" integer, "unit_cost" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, CONSTRAINT "PK_16b495043939cb05b75279b8bf8" PRIMARY KEY ("purchase_item_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."purchase_orders_status_enum" AS ENUM('PENDING', 'RECEIVED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "purchase_orders" ("purchase_order_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying NOT NULL, "supplier_id" uuid NOT NULL, "status" "public"."purchase_orders_status_enum" NOT NULL DEFAULT 'PENDING', "total_cost" numeric(10,2) NOT NULL DEFAULT '0', "notes" character varying, "ordered_by" uuid NOT NULL, "received_by" uuid, "received_at" TIMESTAMP WITH TIME ZONE, "cancellation_reason" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b297010fff05faf7baf4e67afa7" UNIQUE ("order_number"), CONSTRAINT "PK_036b6eb08831997f3601d8a737a" PRIMARY KEY ("purchase_order_id"))`);
        await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "image_url"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "cost_price" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "products" ADD "min_sale_price" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD "supplier_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_clients_nit_real" ON "clients" ("nit") WHERE ((nit IS NOT NULL) AND (upper((nit)::text) <> 'CF'::text))`);
        await queryRunner.query(`ALTER TABLE "sale_items" ALTER COLUMN "product_id" TYPE character varying USING "product_id"::text`);
        await queryRunner.query(`ALTER TABLE "sales" ALTER COLUMN "total" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_c210a330b80232c29c2ad68462a" FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_0cfed735c8c56ad52f6141a8e29" FOREIGN KEY ("salesperson_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_c49d95226945ca3a93584f912ca" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_3f92bb44026cedfe235c8b91244" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("purchase_order_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_d16a885aa88447ccfd010e739b0" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_e8f2e4c1f2ae45a77cc2aebff7b" FOREIGN KEY ("ordered_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_9a28c78df239aa6164db25fa6be" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_5c3bec1682252c36fa161587738" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_c8fd24b784758964dd5c538c9ec" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_4a137ccc372acb73821c4dd3991" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_4a137ccc372acb73821c4dd3991"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_c8fd24b784758964dd5c538c9ec"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_5c3bec1682252c36fa161587738"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_9a28c78df239aa6164db25fa6be"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_e8f2e4c1f2ae45a77cc2aebff7b"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_d16a885aa88447ccfd010e739b0"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_3f92bb44026cedfe235c8b91244"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_c49d95226945ca3a93584f912ca"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_0cfed735c8c56ad52f6141a8e29"`);
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_c210a330b80232c29c2ad68462a"`);
        await queryRunner.query(`ALTER TABLE "sales" ALTER COLUMN "total" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "sale_items" ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid`);
        await queryRunner.query(`DROP INDEX "public"."UQ_clients_nit_real"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" DROP COLUMN "supplier_id"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "min_sale_price"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "cost_price"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "image_url" character varying`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`DROP TABLE "purchase_orders"`);
        await queryRunner.query(`DROP TYPE "public"."purchase_orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "purchase_order_items"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_clients_nit_real"`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inv_movements_user" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inv_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_client" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_salesperson" FOREIGN KEY ("salesperson_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_sale_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_sale_items_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
