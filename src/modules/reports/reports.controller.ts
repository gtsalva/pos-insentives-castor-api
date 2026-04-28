import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ReportsService } from './reports.service';
import {
  TopSellersFilterDto,
  TopProductsFilterDto,
  ProductMarginsFilterDto,
  RevenueFilterDto,
} from './dto/report-filters.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('top-sellers')
  getTopSellers(@Query() filters: TopSellersFilterDto) {
    return this.reportsService.getTopSellers(filters);
  }

  @Get('top-products')
  getTopProducts(@Query() filters: TopProductsFilterDto) {
    return this.reportsService.getTopProducts(filters);
  }

  @Get('product-margins')
  getProductMargins(@Query() filters: ProductMarginsFilterDto) {
    return this.reportsService.getProductMargins(filters);
  }

  @Get('revenue')
  getRevenue(@Query() filters: RevenueFilterDto) {
    return this.reportsService.getRevenue(filters);
  }
}
