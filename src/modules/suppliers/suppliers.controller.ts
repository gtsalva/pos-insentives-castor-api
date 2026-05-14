import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { StorageService } from '../storage/storage.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  findAll(@Query() dto: SupplierQueryDto) {
    return this.suppliersService.findAll(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id/photo')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Actualizar fotografía/logo de proveedor' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) {
        cb(new BadRequestException('Solo se permiten imágenes JPEG, PNG o WebP'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = await this.storageService.uploadFile(file, 'suppliers');
    return this.suppliersService.updatePhoto(id, url);
  }

  @Delete(':id/photo')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Eliminar fotografía/logo de proveedor' })
  removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.updatePhoto(id, null);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }
}
