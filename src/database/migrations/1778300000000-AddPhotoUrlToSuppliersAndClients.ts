import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotoUrlToSuppliersAndClients1778300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS photo_url TEXT`);
    await queryRunner.query(`ALTER TABLE clients  ADD COLUMN IF NOT EXISTS photo_url TEXT`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS photo_url`);
    await queryRunner.query(`ALTER TABLE clients  DROP COLUMN IF EXISTS photo_url`);
  }
}
