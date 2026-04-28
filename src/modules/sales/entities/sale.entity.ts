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
import { Client } from '../../clients/entities/client.entity';
import { SaleItem } from './sale-item.entity';

const numericToFloat = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

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

  @Column({ type: 'varchar', nullable: true })
  void_reason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_document_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  payment_receipt_url: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericToFloat })
  total: number;

  @Column()
  salesperson_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @Column({ type: 'varchar', nullable: true })
  client_id: string | null;

  @ManyToOne(() => Client, { nullable: true, eager: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
