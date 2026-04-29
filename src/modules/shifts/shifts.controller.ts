import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ReopenShiftDto } from './dto/reopen-shift.dto';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('my')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  getMyShift(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.getMyShiftToday(user.sub);
  }

  @Post('close')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  close(@Body() dto: CloseShiftDto, @CurrentUser() user: JwtPayload) {
    return this.shiftsService.close(dto, { id: user.sub, name: user.name }, user.role);
  }

  @Get('daily-summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  dailySummary(@Query('date') date?: string) {
    return this.shiftsService.dailySummary(date);
  }

  @Post(':id/reopen')
  @Roles(Role.ADMIN, Role.MANAGER)
  reopen(@Param('id') id: string, @Body() dto: ReopenShiftDto, @CurrentUser() user: JwtPayload) {
    return this.shiftsService.reopen(id, { id: user.sub, name: user.name }, dto.notes);
  }

  @Post(':id/reconciliation')
  @Roles(Role.ADMIN, Role.MANAGER)
  createReconciliation(
    @Param('id') id: string,
    @Body() dto: CreateReconciliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shiftsService.createReconciliation(id, dto, { id: user.sub, name: user.name });
  }

  @Get(':id/reconciliation')
  @Roles(Role.ADMIN, Role.MANAGER)
  getReconciliation(@Param('id') id: string) {
    return this.shiftsService.getReconciliation(id);
  }
}
