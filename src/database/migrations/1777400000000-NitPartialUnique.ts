import { MigrationInterface, QueryRunner } from 'typeorm';

export class NitPartialUnique1777400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the full unique constraint — CF is shared by many clients
    await queryRunner.query(`ALTER TABLE clients DROP CONSTRAINT IF EXISTS "UQ_clients_nit"`);

    // Partial unique index: enforce uniqueness only for real NITs (not CF, not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_clients_nit_real"
      ON clients (nit)
      WHERE nit IS NOT NULL AND UPPER(nit) != 'CF'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_clients_nit_real"`);
    await queryRunner.query(`ALTER TABLE clients ADD CONSTRAINT "UQ_clients_nit" UNIQUE (nit)`);
  }
}
