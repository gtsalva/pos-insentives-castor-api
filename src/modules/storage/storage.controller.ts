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
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { closeSync, existsSync, openSync, readSync } from 'fs';
import { basename, extname, resolve, sep } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { StorageService } from './storage.service';

class UploadResponseDto {
  @ApiProperty({ example: 'http://localhost:3001/api/storage/products/abc-123.jpg' })
  url: string;

  @ApiProperty({ example: 'image', enum: ['image', 'pdf'], required: false })
  resource_type?: 'image' | 'pdf';
}

const PDF_FILTER = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (file.mimetype !== 'application/pdf') {
    cb(new BadRequestException('Solo se permiten archivos PDF'), false);
  } else {
    cb(null, true);
  }
};

const IMAGE_PDF_FILTER = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    cb(new BadRequestException('Solo se permiten imágenes (JPEG, PNG, WebP) o PDF'), false);
  } else {
    cb(null, true);
  }
};

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALESPERSON, Role.CASHIER, Role.MANAGER, Role.ADMIN)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ── Upload endpoints ──────────────────────────────────────────────────────

  @Post('upload')
  @ApiOperation({ summary: 'Subir comprobante PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: PDF_FILTER }))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = await this.storageService.uploadFile(file, 'vouchers');
    return { url };
  }

  @Post('upload-receipt')
  @ApiOperation({ summary: 'Subir comprobante de pago (imagen o PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: IMAGE_PDF_FILTER }))
  async uploadReceipt(@UploadedFile() file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = await this.storageService.uploadFile(file, 'receipts');
    return { url };
  }

  @Post('products/upload')
  @ApiOperation({ summary: 'Subir imagen o PDF de producto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: IMAGE_PDF_FILTER }))
  async uploadProductFile(@UploadedFile() file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = await this.storageService.uploadFile(file, 'products');
    const resource_type: 'image' | 'pdf' = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    return { url, resource_type };
  }

  // ── Serve endpoints (local dev — en prod R2 sirve desde CDN) ─────────────

  @Get('vouchers/:filename')
  @ApiOperation({ summary: 'Descargar comprobante PDF' })
  serveVoucher(@Param('filename') filename: string, @Res() res: Response): void {
    this.serveFile('vouchers', filename, res);
  }

  @Get('receipts/:filename')
  @ApiOperation({ summary: 'Descargar comprobante de pago' })
  serveReceipt(@Param('filename') filename: string, @Res() res: Response): void {
    const uploadsBase = resolve(process.cwd(), 'uploads', 'receipts');
    const filePath = resolve(uploadsBase, basename(filename));
    if (!filePath.startsWith(uploadsBase + sep)) throw new NotFoundException('Archivo no encontrado');
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    if (!extname(filePath)) res.setHeader('Content-Type', this.detectMime(filePath));
    res.sendFile(filePath);
  }

  @Get('products/:filename')
  @ApiOperation({ summary: 'Servir recurso de producto' })
  serveProductFile(@Param('filename') filename: string, @Res() res: Response): void {
    this.serveFile('products', filename, res);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private serveFile(folder: string, filename: string, res: Response): void {
    const uploadsBase = resolve(process.cwd(), 'uploads', folder);
    const filePath = resolve(uploadsBase, basename(filename));
    if (!filePath.startsWith(uploadsBase + sep)) throw new NotFoundException('Archivo no encontrado');
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
    if (buf.toString('ascii', 0, 4) === 'RIFF') return 'image/webp';
    if (buf.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
    return 'application/octet-stream';
  }
}
