import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  client_id: string;

  @Column({ type: 'varchar', nullable: true, unique: true, length: 20 })
  nit: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  dpi: string | null;

  @Column({ type: 'varchar', length: 200 })
  full_name: string;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  business_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, length: 300 })
  billing_address: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  billing_city: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  billing_department: string | null;

  @Column({ type: 'text', nullable: true })
  photo_url: string | null;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
