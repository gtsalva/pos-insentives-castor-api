import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CleanupSeedService } from './cleanup-seed.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

class CleanupSeedDto {
  @IsOptional()
  @IsBoolean()
  dry_run?: boolean = true;
}

@ApiTags('admin-tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin-tools')
export class CleanupSeedController {
  constructor(private readonly service: CleanupSeedService) {}

  @Post('cleanup-seed')
  @ApiOperation({
    summary: 'Limpieza de datos de prueba (seed)',
    description:
      'Elimina ventas, compras, cotizaciones, productos, clientes y proveedores del seed. ' +
      'Con dry_run=true muestra el conteo sin modificar nada. ' +
      'Solo accesible por ADMIN.',
  })
  run(@Body() dto: CleanupSeedDto) {
    return this.service.run(dto.dry_run ?? true);
  }
}
