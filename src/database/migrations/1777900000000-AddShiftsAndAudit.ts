import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShiftsAndAudit1777900000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE shift_status_enum AS ENUM ('CLOSED', 'REOPENED');

      CREATE TABLE shift_closes (
        shift_close_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salesperson_id UUID NOT NULL REFERENCES users(user_id),
        shift_date DATE NOT NULL,
        status shift_status_enum NOT NULL DEFAULT 'CLOSED',
        total_sales NUMERIC(10,2) NOT NULL DEFAULT 0,
        cash_total NUMERIC(10,2) NOT NULL DEFAULT 0,
        card_total NUMERIC(10,2) NOT NULL DEFAULT 0,
        transfer_total NUMERIC(10,2) NOT NULL DEFAULT 0,
        transaction_count INT NOT NULL DEFAULT 0,
        closed_by_id UUID NOT NULL REFERENCES users(user_id),
        notes VARCHAR,
        reopened_by_id UUID REFERENCES users(user_id),
        reopened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_shift_salesperson_date UNIQUE (salesperson_id, shift_date)
      );

      CREATE TABLE reconciliations (
        reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shift_close_id UUID NOT NULL UNIQUE REFERENCES shift_closes(shift_close_id),
        cash_expected NUMERIC(10,2) NOT NULL DEFAULT 0,
        card_expected NUMERIC(10,2) NOT NULL DEFAULT 0,
        transfer_expected NUMERIC(10,2) NOT NULL DEFAULT 0,
        cash_counted NUMERIC(10,2) NOT NULL DEFAULT 0,
        card_counted NUMERIC(10,2) NOT NULL DEFAULT 0,
        transfer_counted NUMERIC(10,2) NOT NULL DEFAULT 0,
        other_counted NUMERIC(10,2) NOT NULL DEFAULT 0,
        cash_difference NUMERIC(10,2) NOT NULL DEFAULT 0,
        card_difference NUMERIC(10,2) NOT NULL DEFAULT 0,
        transfer_difference NUMERIC(10,2) NOT NULL DEFAULT 0,
        reconciled_by_id UUID NOT NULL REFERENCES users(user_id),
        notes VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE audit_logs (
        audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR NOT NULL,
        entity_type VARCHAR,
        entity_id VARCHAR,
        performed_by_id UUID NOT NULL,
        performed_by_name VARCHAR NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_audit_action ON audit_logs(action);
      CREATE INDEX idx_audit_by ON audit_logs(performed_by_id);
      CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
      CREATE INDEX idx_shift_date ON shift_closes(shift_date);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS reconciliations;
      DROP TABLE IF EXISTS shift_closes;
      DROP TABLE IF EXISTS audit_logs;
      DROP TYPE IF EXISTS shift_status_enum;
    `);
  }
}
