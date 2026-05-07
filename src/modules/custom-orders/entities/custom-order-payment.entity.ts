import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { CustomOrder } from './custom-order.entity';
import { User }        from '../../users/entities/user.entity';
import { PaymentMethod } from '../../sales/entities/payment-method.enum';

const n2f = { to: (v: number | null) => v, from: (v: string | null) => (v !== null ? parseFloat(v) : null) };

@Entity('custom_order_payments')
export class CustomOrderPayment {
  @PrimaryGeneratedColumn('uuid') custom_order_payment_id: string;

  @Column()                       custom_order_id: string;
  @ManyToOne(() => CustomOrder, (o) => o.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'custom_order_id' })
  custom_order: CustomOrder;

  @Column({ type: 'enum', enum: PaymentMethod }) payment_method: PaymentMethod;
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: n2f }) amount: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) payment_reference: string | null;

  @Column()                       received_by_id: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by_id' })
  received_by: User;

  @Column({ type: 'varchar', length: 300, nullable: true }) notes: string | null;
  @CreateDateColumn() created_at: Date;
}
