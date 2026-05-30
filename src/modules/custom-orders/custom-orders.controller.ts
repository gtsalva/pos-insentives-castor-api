import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard }      from '../../common/guards/jwt-auth.guard';
import { RolesGuard }        from '../../common/guards/roles.guard';
import { Roles }             from '../../common/decorators/roles.decorator';
import { CurrentUser }       from '../../common/decorators/current-user.decorator';
import { Role }              from '../../common/enums/role.enum';
import { JwtPayload }        from '../../common/interfaces/jwt-payload.interface';
import { CustomOrdersService } from './custom-orders.service';
import { CreateCustomOrderDto }  from './dto/create-custom-order.dto';
import { UpdateCustomOrderDto }  from './dto/update-custom-order.dto';
import { ApproveCustomOrderDto } from './dto/approve-custom-order.dto';
import { RegisterPaymentDto }           from './dto/register-payment.dto';
import { RegisterCommissionPaymentDto } from './dto/register-commission-payment.dto';
import { CustomOrderQueryDto }   from './dto/custom-order-query.dto';
import { CustomOrderStatus }     from './entities/custom-order-status.enum';

@ApiTags('custom-orders')
@ApiBearerAuth()
@Controller('custom-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomOrdersController {
  constructor(private readonly service: CustomOrdersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  findAll(@Query() query: CustomOrderQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  create(@Body() dto: CreateCustomOrderDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, { id: user.sub, name: user.name });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, { id: user.sub, name: user.name });
  }

  @Patch(':id/send')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  send(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.transition(id, CustomOrderStatus.SENT, { id: user.sub, name: user.name });
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCustomOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.transition(id, CustomOrderStatus.APPROVED, { id: user.sub, name: user.name }, dto.delivery_date);
  }

  @Patch(':id/production')
  @Roles(Role.ADMIN, Role.MANAGER)
  markProduction(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.transition(id, CustomOrderStatus.IN_PRODUCTION, { id: user.sub, name: user.name });
  }

  @Patch(':id/deliver')
  @Roles(Role.ADMIN, Role.MANAGER)
  markDelivered(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.transition(id, CustomOrderStatus.DELIVERED, { id: user.sub, name: user.name });
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.transition(id, CustomOrderStatus.CANCELLED, { id: user.sub, name: user.name });
  }

  @Post(':id/payments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  registerPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registerPayment(id, dto, { id: user.sub, name: user.name });
  }

  @Post(':id/commission-payments')
  @Roles(Role.ADMIN, Role.MANAGER)
  registerCommissionPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterCommissionPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registerCommissionPayment(id, dto, { id: user.sub, name: user.name });
  }

  @Post(':id/print-receipts')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALESPERSON, Role.CASHIER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  registerPrintReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registerPrintReceipt(id, { id: user.sub, name: user.name }, file);
  }

  @Patch(':id/delivery-date')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateDeliveryDate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('delivery_date') delivery_date: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateDeliveryDate(id, delivery_date, { id: user.sub, name: user.name });
  }
}
