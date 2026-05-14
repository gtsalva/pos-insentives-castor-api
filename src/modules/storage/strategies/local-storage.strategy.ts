import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageStrategy } from '../interfaces/storage-strategy.interface';

export class LocalStorageStrategy implements StorageStrategy {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname) || this.extFromMime(file.mimetype);
    const filename = `${uuidv4()}-${Date.now()}${ext}`;
    const folderPath = path.join(this.uploadDir, folder);
    const filePath = path.join(folderPath, filename);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`[LocalStorage] ${filePath}`);

    const apiUrl = this.configService.get<string>('API_URL') ?? 'http://localhost:3001';
    return `${apiUrl}/api/storage/${folder}/${filename}`;
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mime] ?? '';
  }
}
