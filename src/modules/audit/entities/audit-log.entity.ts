import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  audit_log_id: string;

  @Column()
  action: string;

  @Column({ nullable: true, type: 'varchar' })
  entity_type: string | null;

  @Column({ nullable: true, type: 'varchar' })
  entity_id: string | null;

  // No FK constraint intentionally: fire-and-forget audit must not fail if user is deleted.
  // performed_by_name is denormalized for the same reason.
  @Column()
  performed_by_id: string;

  @Column()
  performed_by_name: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}
