import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('store_settings')
export class StoreSettings {
  @PrimaryGeneratedColumn()
  setting_id: number;

  @Column({ length: 200, default: 'Mueblería El Castor' })
  store_name: string;

  @UpdateDateColumn()
  updated_at: Date;
}
