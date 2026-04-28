import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { IncentivesService } from './incentives.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodQueryDto } from './dto/period-query.dto';

@Controller('incentives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncentivesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  @Get('my-performance')
  @Roles(Role.SALESPERSON, Role.CASHIER, Role.MANAGER, Role.ADMIN)
  getMyPerformance(@CurrentUser() user: JwtPayload) {
    return this.incentivesService.getMyPerformance(user.sub);
  }

  @Get('periods')
  @Roles(Role.MANAGER, Role.ADMIN)
  findAll(@Query() query: PeriodQueryDto) {
    return this.incentivesService.findAll(query);
  }

  @Post('periods')
  @Roles(Role.MANAGER, Role.ADMIN)
  create(@Body() dto: CreatePeriodDto, @CurrentUser() user: JwtPayload) {
    return this.incentivesService.create(dto, user.sub);
  }

  @Get('periods/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.incentivesService.findOne(id);
  }

  @Patch('periods/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.incentivesService.update(id, dto);
  }

  @Get('periods/:id/performance')
  @Roles(Role.MANAGER, Role.ADMIN)
  getPeriodPerformance(@Param('id') id: string) {
    return this.incentivesService.getPeriodPerformance(id);
  }

  @Post('periods/:id/liquidate/:salesperson_id')
  @Roles(Role.MANAGER, Role.ADMIN)
  liquidate(
    @Param('id') period_id: string,
    @Param('salesperson_id') salesperson_id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incentivesService.liquidate(period_id, salesperson_id, user.sub);
  }
}
