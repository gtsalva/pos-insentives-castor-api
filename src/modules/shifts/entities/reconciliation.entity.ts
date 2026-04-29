import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ShiftClose } from './shift-close.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('reconciliations')
export class Reconciliation {
  @PrimaryGeneratedColumn('uuid')
  reconciliation_id: string;

  @Column()
  shift_close_id: string;

  @OneToOne(() => ShiftClose, (sc) => sc.reconciliation)
  @JoinColumn({ name: 'shift_close_id' })
  shift_close: ShiftClose;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  cash_expected: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  card_expected: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  transfer_expected: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  cash_counted: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  card_counted: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  transfer_counted: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  other_counted: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  cash_difference: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  card_difference: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToFloat,
  })
  transfer_difference: number;

  @Column()
  reconciled_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reconciled_by_id' })
  reconciled_by: User;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;
}
