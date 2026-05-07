import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { CustomOrder } from './custom-order.entity';
import { User }        from '../../users/entities/user.entity';

const n2f = { to: (v: number | null) => v, from: (v: string | null) => (v !== null ? parseFloat(v) : null) };

@Entity('custom_order_commission_payments')
export class CustomOrderCommissionPayment {
  @PrimaryGeneratedColumn('uuid') commission_payment_id: string;

  @Column()                       custom_order_id: string;
  @ManyToOne(() => CustomOrder, (o) => o.commission_payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'custom_order_id' })
  custom_order: CustomOrder;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: n2f }) amount: number;
  @Column({ type: 'varchar', length: 300, nullable: true }) notes: string | null;

  @Column()                       paid_by_id: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'paid_by_id' })
  paid_by: User;

  @CreateDateColumn() created_at: Date;
}
