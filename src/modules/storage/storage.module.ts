import { Module, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { StorageController } from './storage.controller';

@Module({
  controllers: [StorageController],
})
export class StorageModule implements OnModuleInit {
  onModuleInit(): void {
    mkdirSync(join(process.cwd(), 'uploads', 'vouchers'), { recursive: true });
  }
}
