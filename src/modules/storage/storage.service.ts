import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageStrategy } from './interfaces/storage-strategy.interface';
import { LocalStorageStrategy } from './strategies/local-storage.strategy';
import { R2StorageStrategy } from './strategies/r2-storage.strategy';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly strategy: StorageStrategy;

  constructor(private readonly configService: ConfigService) {
    const provider = configService.get<string>('STORAGE_PROVIDER') ?? 'local';

    if (provider === 'local') {
      this.logger.log('Estrategia de almacenamiento: Local');
      this.strategy = new LocalStorageStrategy(configService);
    } else {
      this.logger.log('Estrategia de almacenamiento: Cloudflare R2');
      this.strategy = new R2StorageStrategy(configService);
    }
  }

  uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return this.strategy.uploadFile(file, folder);
  }
}
