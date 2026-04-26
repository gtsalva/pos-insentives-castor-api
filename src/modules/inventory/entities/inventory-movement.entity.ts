import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  movement_id: string;

  @Column()
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  reference_id: string;

  @Column()
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
