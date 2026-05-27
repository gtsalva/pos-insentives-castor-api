import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('store_settings')
export class StoreSettings {
  @PrimaryGeneratedColumn()
  setting_id: number;

  @Column({ length: 200, default: 'Mueblería El Castor' })
  store_name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20.0 })
  min_price_margin: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 35.0 })
  sale_price_margin: number;

  @UpdateDateColumn()
  updated_at: Date;
}
