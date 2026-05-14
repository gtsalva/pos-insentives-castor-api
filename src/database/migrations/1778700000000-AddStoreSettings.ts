import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreSettings1778700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_settings" (
        "setting_id"  SERIAL        NOT NULL,
        "store_name"  VARCHAR(200)  NOT NULL DEFAULT 'Mueblería El Castor',
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_settings" PRIMARY KEY ("setting_id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "store_settings" ("store_name")
      SELECT 'Mueblería El Castor'
      WHERE NOT EXISTS (SELECT 1 FROM "store_settings")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_settings"`);
  }
}
