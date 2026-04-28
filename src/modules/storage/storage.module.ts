import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { StorageController } from './storage.controller';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
})
export class StorageModule implements OnModuleInit {
  onModuleInit(): void {
    mkdirSync(join(process.cwd(), 'uploads', 'vouchers'), { recursive: true });
    mkdirSync(join(process.cwd(), 'uploads', 'receipts'), { recursive: true });
    mkdirSync(join(process.cwd(), 'uploads', 'products'), { recursive: true });
  }
}
