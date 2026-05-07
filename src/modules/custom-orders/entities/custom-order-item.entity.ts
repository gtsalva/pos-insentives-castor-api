import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomOrder } from './custom-order.entity';

const n2f = { to: (v: number | null) => v, from: (v: string | null) => (v !== null ? parseFloat(v) : null) };

@Entity('custom_order_items')
export class CustomOrderItem {
  @PrimaryGeneratedColumn('uuid') custom_order_item_id: string;

  @Column()                       custom_order_id: string;
  @ManyToOne(() => CustomOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'custom_order_id' })
  custom_order: CustomOrder;

  @Column({ length: 300 })                                                              description: string;
  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: n2f })              quantity:    number;
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: n2f })              unit_price:  number;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: n2f }) cost_price: number | null;
  @Column({ type: 'varchar', length: 300, nullable: true })                            notes:       string | null;
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: n2f })              subtotal:    number;
}
