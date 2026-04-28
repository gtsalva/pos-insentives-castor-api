import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

export type ResourceType = 'image' | 'pdf';

@Entity('product_resources')
export class ProductResource {
  @PrimaryGeneratedColumn('uuid')
  resource_id: string;

  @Column()
  product_id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  url: string;

  @Column({ type: 'varchar', length: 10 })
  resource_type: ResourceType;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}
