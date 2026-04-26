import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  getAll(@Query() dto: GetInventoryDto) {
    return this.inventoryService.getAll(dto);
  }

  @Get(':productId/movements')
  @Roles(Role.ADMIN, Role.MANAGER)
  getMovements(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getMovements(productId, page, limit);
  }

  @Post('adjust')
  @Roles(Role.ADMIN, Role.MANAGER)
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') created_by: string,
  ) {
    return this.inventoryService.adjust(dto, created_by);
  }
}
