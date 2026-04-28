import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncentivesSchema1777800000000 implements MigrationInterface {
  name = 'IncentivesSchema1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "incentive_periods" (
        "period_id"       UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"            VARCHAR(100) NOT NULL,
        "start_date"      DATE NOT NULL,
        "end_date"        DATE NOT NULL,
        "goal_amount"     NUMERIC(12,2) NOT NULL,
        "commission_rate" NUMERIC(5,2) NOT NULL,
        "is_active"       BOOLEAN NOT NULL DEFAULT true,
        "created_by_id"   UUID,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incentive_periods" PRIMARY KEY ("period_id"),
        CONSTRAINT "FK_incentive_periods_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users" ("user_id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "incentive_liquidations" (
        "liquidation_id"    UUID NOT NULL DEFAULT gen_random_uuid(),
        "period_id"         UUID NOT NULL,
        "salesperson_id"    UUID NOT NULL,
        "amount_sold"       NUMERIC(12,2) NOT NULL,
        "commission_earned" NUMERIC(10,2) NOT NULL,
        "liquidated_by_id"  UUID NOT NULL,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incentive_liquidations" PRIMARY KEY ("liquidation_id"),
        CONSTRAINT "UQ_liquidation_period_salesperson"
          UNIQUE ("period_id", "salesperson_id"),
        CONSTRAINT "FK_liquidation_period"
          FOREIGN KEY ("period_id") REFERENCES "incentive_periods" ("period_id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_liquidation_salesperson"
          FOREIGN KEY ("salesperson_id") REFERENCES "users" ("user_id"),
        CONSTRAINT "FK_liquidation_liquidated_by"
          FOREIGN KEY ("liquidated_by_id") REFERENCES "users" ("user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "incentive_liquidations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incentive_periods"`);
  }
}
