import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

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

  @Patch(':client_id')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  @Roles(Role.MANAGER, Role.ADMIN)
  update(@Param('client_id', ParseUUIDPipe) client_id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(client_id, dto);
  }

  @Delete(':client_id')
  @ApiOperation({ summary: 'Desactivar cliente' })
  @Roles(Role.MANAGER, Role.ADMIN)
  deactivate(@Param('client_id', ParseUUIDPipe) client_id: string) {
    return this.service.deactivate(client_id);
  }
}
