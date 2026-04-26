import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { GetSalesDto } from './dto/get-sales.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser('sub') salesperson_id: string,
  ) {
    return this.salesService.create(dto, salesperson_id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll(@Query() dto: GetSalesDto) {
    return this.salesService.findAll(dto);
  }

  @Get('my')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  findMine(
    @Query() dto: GetSalesDto,
    @CurrentUser('sub') salesperson_id: string,
  ) {
    return this.salesService.findAll({ ...dto, salesperson_id });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN, Role.MANAGER)
  voidSale(@Param('id') id: string, @Body() dto: VoidSaleDto) {
    return this.salesService.voidSale(id, dto);
  }
}
