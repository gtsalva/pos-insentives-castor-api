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
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ConfigService } from '@nestjs/config';

class UploadResponseDto {
  @ApiProperty({ example: 'http://localhost:3001/api/storage/vouchers/abc-123.pdf' })
  url: string;
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
        filename: (_req, _file, cb) => {
          cb(null, `${randomUUID()}-${Date.now()}.pdf`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
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
}
