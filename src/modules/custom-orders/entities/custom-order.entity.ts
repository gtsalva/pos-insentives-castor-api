import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User }     from '../../users/entities/user.entity';
import { Client }   from '../../clients/entities/client.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { CustomOrderStatus }  from './custom-order-status.enum';
import { CustomOrderItem }              from './custom-order-item.entity';
import { CustomOrderPayment }           from './custom-order-payment.entity';
import { CustomOrderCommissionPayment } from './custom-order-commission-payment.entity';
import { CustomOrderPrintReceipt }      from './custom-order-print-receipt.entity';

const n2f = { to: (v: number | null) => v, from: (v: string | null) => (v !== null ? parseFloat(v) : null) };

@Entity('custom_orders')
export class CustomOrder {
  @PrimaryGeneratedColumn('uuid') custom_order_id: string;
  @Column({ unique: true })       order_number: string;

  @Column({ type: 'enum', enum: CustomOrderStatus, default: CustomOrderStatus.DRAFT })
  status: CustomOrderStatus;

  @Column()                       salesperson_id: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @Column({ type: 'varchar', nullable: true }) client_id: string | null;
  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @Column({ type: 'varchar', length: 150, nullable: true }) client_name:  string | null;
  @Column({ type: 'varchar', length: 30,  nullable: true }) client_phone: string | null;
  @Column({ type: 'varchar', length: 150, nullable: true }) client_email: string | null;

  @Column({ type: 'text', nullable: true }) notes:        string | null;
  @Column({ type: 'text', nullable: true }) client_notes: string | null;

  @Column({ type: 'date', nullable: true }) delivery_date: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: n2f }) total:       number;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: n2f }) agreed_price: number | null;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: n2f }) total_paid:  number;
  @Column({ default: true }) counts_for_incentive: boolean;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: n2f }) custom_commission: number | null;

  @Column({ type: 'varchar', nullable: true }) supplier_id: string | null;
  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column({ type: 'varchar', nullable: true }) linked_purchase_order_id: string | null;

  @OneToMany(() => CustomOrderItem,              (i)  => i.custom_order,  { cascade: true })  items:               CustomOrderItem[];
  @OneToMany(() => CustomOrderPayment,           (p)  => p.custom_order,  { cascade: false }) payments:            CustomOrderPayment[];
  @OneToMany(() => CustomOrderCommissionPayment, (cp) => cp.custom_order, { cascade: false }) commission_payments: CustomOrderCommissionPayment[];
  @OneToMany(() => CustomOrderPrintReceipt,      (pr) => pr.custom_order, { cascade: false }) print_receipts:     CustomOrderPrintReceipt[];

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
