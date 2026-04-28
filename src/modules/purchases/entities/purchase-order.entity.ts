import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseStatus {
  PENDING   = 'PENDING',
  RECEIVED  = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  purchase_order_id: string;

  @Column({ unique: true })
  order_number: string;

  @Column()
  supplier_id: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  total_cost: number;

  @Column({ nullable: true })
  notes: string;

  @Column()
  ordered_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ordered_by' })
  ordered_by_user: User;

  @Column({ nullable: true })
  received_by: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'received_by' })
  received_by_user: User;

  @Column({ type: 'timestamptz', nullable: true })
  received_at: Date;

  @Column({ nullable: true })
  cancellation_reason: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchase_order, { cascade: true })
  items: PurchaseOrderItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
