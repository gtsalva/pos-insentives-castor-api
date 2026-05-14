import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  product_id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  unit_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericToFloat })
  cost_price: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericToFloat })
  min_sale_price: number | null;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  min_stock: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ nullable: true })
  category_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
