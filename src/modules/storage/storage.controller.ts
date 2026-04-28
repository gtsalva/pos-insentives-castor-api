import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { closeSync, existsSync, openSync, readSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ConfigService } from '@nestjs/config';

class UploadResponseDto {
  @ApiProperty({ example: 'http://localhost:3001/api/storage/products/abc-123.jpg' })
  url: string;

  @ApiProperty({ example: 'image', enum: ['image', 'pdf'], required: false })
  resource_type?: 'image' | 'pdf';
}

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALESPERSON, Role.CASHIER, Role.MANAGER, Role.ADMIN)
export class StorageController {
  constructor(private readonly config: ConfigService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir comprobante PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'vouchers'),
        filename: (
          _req: Express.Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          cb(null, `${randomUUID()}-${Date.now()}.pdf`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Solo se permiten archivos PDF'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    return { url: `${apiUrl}/api/storage/vouchers/${file.filename}` };
  }

  @Get('vouchers/:filename')
  @ApiOperation({ summary: 'Descargar comprobante PDF' })
  @ApiResponse({ status: 200, description: 'PDF stream' })
  serveVoucher(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    const safe = basename(filename);
    const filePath = join(process.cwd(), 'uploads', 'vouchers', safe);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    res.sendFile(filePath);
  }

  @Post('upload-receipt')
  @ApiOperation({ summary: 'Subir comprobante de pago (imagen o PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'receipts'),
        filename: (
          _req: Express.Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const mimeExt: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
          };
          const ext = mimeExt[file.mimetype] ?? '';
          cb(null, `${randomUUID()}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Solo se permiten imágenes (JPEG, PNG, WebP) o PDF'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadReceipt(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    return { url: `${apiUrl}/api/storage/receipts/${file.filename}` };
  }

  @Get('receipts/:filename')
  @ApiOperation({ summary: 'Descargar comprobante de pago' })
  @ApiResponse({ status: 200, description: 'Archivo stream' })
  serveReceipt(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    const safe = basename(filename);
    const filePath = join(process.cwd(), 'uploads', 'receipts', safe);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');

    // Legacy files have no extension — detect MIME from magic bytes so the
    // browser renders them instead of downloading as application/octet-stream.
    if (!extname(safe)) {
      res.setHeader('Content-Type', this.detectMime(filePath));
    }

    res.sendFile(filePath);
  }

  @Post('products/upload')
  @ApiOperation({ summary: 'Subir imagen o PDF de producto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'products'),
        filename: (
          _req: Express.Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const mimeExt: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
          };
          const ext = mimeExt[file.mimetype] ?? '';
          cb(null, `${randomUUID()}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Solo imágenes (JPEG, PNG, WebP) o PDF'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadProductFile(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    const resourceType: 'image' | 'pdf' = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    return {
      url: `${apiUrl}/api/storage/products/${file.filename}`,
      resource_type: resourceType,
    };
  }

  @Get('products/:filename')
  @ApiOperation({ summary: 'Servir recurso de producto' })
  @ApiResponse({ status: 200, description: 'Archivo de producto (imagen o PDF)' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  serveProductFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    const safe = basename(filename);
    const filePath = join(process.cwd(), 'uploads', 'products', safe);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    res.sendFile(filePath);
  }

  private detectMime(filePath: string): string {
    const buf = Buffer.alloc(8);
    const fd = openSync(filePath, 'r');
    readSync(fd, buf, 0, 8, 0);
    closeSync(fd);

    if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') return 'image/webp';
    if (buf.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
    return 'application/octet-stream';
  }
}
