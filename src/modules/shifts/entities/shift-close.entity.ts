import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reconciliation } from './reconciliation.entity';

export enum ShiftStatus {
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('shift_closes')
export class ShiftClose {
  @PrimaryGeneratedColumn('uuid')
  shift_close_id: string;

  @Column()
  salesperson_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @Column({ type: 'date' })
  shift_date: string;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.CLOSED })
  status: ShiftStatus;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  total_sales: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  cash_total: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  card_total: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  transfer_total: number;

  @Column({ type: 'int' })
  transaction_count: number;

  @Column()
  closed_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closed_by_id' })
  closed_by: User;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  reopened_by_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reopened_by_id' })
  reopened_by: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reopened_at: Date | null;

  @OneToOne(() => Reconciliation, (r) => r.shift_close, {
    nullable: true,
    eager: false,
  })
  reconciliation: Reconciliation | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
