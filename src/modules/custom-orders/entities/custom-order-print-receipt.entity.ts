import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { CustomOrder } from './custom-order.entity';
import { User }        from '../../users/entities/user.entity';

@Entity('custom_order_print_receipts')
export class CustomOrderPrintReceipt {
  @PrimaryGeneratedColumn('uuid') print_receipt_id: string;

  @Column({ type: 'uuid' })       custom_order_id: string;
  @ManyToOne(() => CustomOrder, (o) => o.print_receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'custom_order_id' })
  custom_order: CustomOrder;

  @Column({ type: 'uuid' })       printed_by_id: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'printed_by_id' })
  printed_by: User;

  @Column({ type: 'text', nullable: true, default: null })
  pdf_url: string | null;

  @CreateDateColumn() created_at: Date;
}
