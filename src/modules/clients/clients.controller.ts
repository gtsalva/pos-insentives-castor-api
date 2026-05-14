import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ClientsService } from './clients.service';
import { StorageService } from '../storage/storage.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(
    private readonly service: ClientsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @Roles(Role.CASHIER, Role.SALESPERSON, Role.MANAGER, Role.ADMIN)
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes con búsqueda y paginación' })
  @Roles(Role.CASHIER, Role.SALESPERSON, Role.MANAGER, Role.ADMIN)
  findAll(@Query() dto: ClientQueryDto) {
    return this.service.findAll(dto);
  }

  @Get(':client_id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @Roles(Role.CASHIER, Role.SALESPERSON, Role.MANAGER, Role.ADMIN)
  findOne(@Param('client_id', ParseUUIDPipe) client_id: string) {
    return this.service.findOne(client_id);
  }

  @Patch(':client_id/photo')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Actualizar fotografía de cliente' })
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
    @Param('client_id', ParseUUIDPipe) client_id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = await this.storageService.uploadFile(file, 'clients');
    return this.service.updatePhoto(client_id, url);
  }

  @Patch(':client_id')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  @Roles(Role.MANAGER, Role.ADMIN)
  update(@Param('client_id', ParseUUIDPipe) client_id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(client_id, dto);
  }

  @Delete(':client_id/photo')
  @ApiOperation({ summary: 'Eliminar fotografía de cliente' })
  @Roles(Role.MANAGER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  removePhoto(@Param('client_id', ParseUUIDPipe) client_id: string) {
    return this.service.updatePhoto(client_id, null);
  }

  @Delete(':client_id')
  @ApiOperation({ summary: 'Desactivar cliente' })
  @Roles(Role.MANAGER, Role.ADMIN)
  deactivate(@Param('client_id', ParseUUIDPipe) client_id: string) {
    return this.service.deactivate(client_id);
  }
}
