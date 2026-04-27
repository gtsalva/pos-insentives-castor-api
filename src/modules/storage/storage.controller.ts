import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ConfigService } from '@nestjs/config';

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
  upload(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    return { url: `${apiUrl}/uploads/vouchers/${file.filename}` };
  }
}
