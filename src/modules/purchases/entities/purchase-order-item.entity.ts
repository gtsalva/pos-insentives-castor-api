import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  purchase_item_id: string;

  @Column()
  purchase_order_id: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items)
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order: PurchaseOrder;

  @Column()
  product_id: string;

  @Column({ length: 50 })
  product_sku: string;

  @Column({ length: 150 })
  product_name: string;

  @Column({ type: 'int' })
  quantity_ordered: number;

  @Column({ type: 'int', nullable: true })
  quantity_received: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unit_cost: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal: number;
}
