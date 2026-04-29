import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShiftClose } from '../shifts/entities/shift-close.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product, ShiftClose])],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
