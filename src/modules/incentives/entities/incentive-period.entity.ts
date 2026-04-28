import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToMany, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { IncentiveLiquidation } from './incentive-liquidation.entity';
import { User } from '../../users/entities/user.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('incentive_periods')
export class IncentivePeriod {
  @PrimaryGeneratedColumn('uuid')
  period_id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericToFloat })
  goal_amount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: numericToFloat })
  commission_rate: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'varchar', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @OneToMany(() => IncentiveLiquidation, liq => liq.period, { cascade: false })
  liquidations: IncentiveLiquidation[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
