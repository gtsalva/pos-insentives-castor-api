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
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

class CancelPurchaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cancellation_reason: string;
}

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@Query() dto: PurchaseQueryDto) {
    return this.purchasesService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('sub') ordered_by: string,
  ) {
    return this.purchasesService.create(dto, ordered_by);
  }

  @Patch(':id/receive')
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseDto,
    @CurrentUser('sub') received_by: string,
  ) {
    return this.purchasesService.receive(id, dto, received_by);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelPurchaseDto) {
    return this.purchasesService.cancel(id, dto.cancellation_reason);
  }
}
