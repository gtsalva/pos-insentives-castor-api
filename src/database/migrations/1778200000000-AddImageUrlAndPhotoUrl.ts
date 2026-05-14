import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrlAndPhotoUrl1778200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`);
    await queryRunner.query(`
      UPDATE products p
      SET image_url = pr.url
      FROM product_resources pr
      WHERE pr.product_id::uuid = p.product_id
        AND pr.resource_type = 'image'
        AND pr.sort_order = 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS image_url`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS photo_url`);
  }
}
