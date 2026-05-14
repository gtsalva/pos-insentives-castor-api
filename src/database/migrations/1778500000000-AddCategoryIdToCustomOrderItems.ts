import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIdToCustomOrderItems1778500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE custom_order_items
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE custom_order_items DROP COLUMN IF EXISTS category_id
    `);
  }
}
