import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Sale } from './sale.entity';
import { PaymentMethod } from './payment-method.enum';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('sale_payments')
export class SalePayment {
  @PrimaryGeneratedColumn('uuid')
  sale_payment_id: string;

  @Column()
  sale_id: string;

  @ManyToOne(() => Sale, (sale) => sale.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference: string | null;

  @CreateDateColumn()
  created_at: Date;
}
