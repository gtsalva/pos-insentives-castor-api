import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

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

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  unit_cost: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  subtotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericToFloat })
  min_sale_price: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericToFloat })
  unit_price: number | null;
}
