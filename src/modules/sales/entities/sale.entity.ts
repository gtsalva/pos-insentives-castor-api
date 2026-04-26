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
import { SaleItem } from './sale-item.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  sale_id: string;

  @Column({ unique: true })
  sale_number: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ nullable: true })
  void_reason: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total: number;

  @Column()
  salesperson_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
