import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { IncentivePeriod } from './incentive-period.entity';
import { User } from '../../users/entities/user.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('incentive_liquidations')
export class IncentiveLiquidation {
  @PrimaryGeneratedColumn('uuid')
  liquidation_id: string;

  @Column()
  period_id: string;

  @ManyToOne(() => IncentivePeriod, p => p.liquidations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: IncentivePeriod;

  @Column()
  salesperson_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericToFloat })
  amount_sold: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  commission_earned: number;

  @Column({ type: 'varchar' })
  liquidated_by_id: string;

  @CreateDateColumn()
  created_at: Date;
}
