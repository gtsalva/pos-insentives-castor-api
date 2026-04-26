import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryMovements1777200000001 implements MigrationInterface {
  name = 'InventoryMovements1777200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_movements_movement_type_enum" AS ENUM('IN', 'OUT', 'ADJUSTMENT')`,
    );
    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "movement_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "movement_type" "public"."inventory_movements_movement_type_enum" NOT NULL,
        "quantity" integer NOT NULL,
        "notes" character varying,
        "reference_id" character varying,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("movement_id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inv_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inv_movements_user" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inv_movements_user"`);
    await queryRunner.query(`ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inv_movements_product"`);
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP TYPE "public"."inventory_movements_movement_type_enum"`);
  }
}
