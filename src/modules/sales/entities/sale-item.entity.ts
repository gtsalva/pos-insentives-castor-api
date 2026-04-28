import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  sale_item_id: string;

  @Column()
  sale_id: string;

  @ManyToOne(() => Sale, (sale) => sale.items)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column()
  product_id: string;

  @Column()
  product_sku: string;

  @Column()
  product_name: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  unit_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  subtotal: number;
}
