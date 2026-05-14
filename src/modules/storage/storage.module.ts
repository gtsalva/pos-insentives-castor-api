import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const provider = this.configService.get<string>('STORAGE_PROVIDER') ?? 'local';
    if (provider === 'local') {
      for (const folder of ['vouchers', 'receipts', 'products']) {
        mkdirSync(join(process.cwd(), 'uploads', folder), { recursive: true });
      }
    }
  }
}
