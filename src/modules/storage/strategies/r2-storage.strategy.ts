import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageStrategy } from '../interfaces/storage-strategy.interface';

export class R2StorageStrategy implements StorageStrategy {
  private readonly logger = new Logger(R2StorageStrategy.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrlPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY') ?? '';
    this.bucket = configService.get<string>('R2_BUCKET_NAME') ?? 'pos-castor-assets';

    let prefix = configService.get<string>('R2_PUBLIC_URL_PREFIX') ?? '';
    if (prefix.endsWith('/')) prefix = prefix.slice(0, -1);
    this.publicUrlPrefix = prefix;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('[R2Storage] Credenciales incompletas — los uploads fallarán.');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname) || this.extFromMime(file.mimetype);
    const key = `${folder}/${uuidv4()}-${Date.now()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrlPrefix}/${key}`;
    this.logger.log(`[R2Storage] ${url}`);
    return url;
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
