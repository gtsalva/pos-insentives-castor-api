import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductResources1777600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_resources" (
        "resource_id"   uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id"    uuid NOT NULL,
        "url"           varchar NOT NULL,
        "resource_type" varchar(10) NOT NULL,
        "sort_order"    integer NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_resources" PRIMARY KEY ("resource_id"),
        CONSTRAINT "FK_product_resources_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_product_resources_product_id" ON "product_resources" ("product_id")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "product_resources"`);
  }
}
