import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientsAndStorageFields1777300000000 implements MigrationInterface {
  name = 'AddClientsAndStorageFields1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "client_id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "nit"                varchar(20),
        "dpi"                varchar(20),
        "full_name"          varchar(200) NOT NULL,
        "business_name"      varchar(200),
        "email"              varchar,
        "phone"              varchar(20),
        "billing_address"    varchar(300),
        "billing_city"       varchar(100),
        "billing_department" varchar(100),
        "is_active"          boolean      NOT NULL DEFAULT true,
        "created_at"         TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clients"     PRIMARY KEY ("client_id"),
        CONSTRAINT "UQ_clients_nit" UNIQUE      ("nit")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "client_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "payment_document_url" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "payment_reference" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_sales_client" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_client"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "payment_reference"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "payment_document_url"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "client_id"`);
    await queryRunner.query(`DROP TABLE "clients"`);
  }
}
