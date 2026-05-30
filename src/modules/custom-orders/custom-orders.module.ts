import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { CustomOrder }                    from './entities/custom-order.entity';
import { CustomOrderItem }               from './entities/custom-order-item.entity';
import { CustomOrderPayment }            from './entities/custom-order-payment.entity';
import { CustomOrderCommissionPayment }  from './entities/custom-order-commission-payment.entity';
import { CustomOrderPrintReceipt }       from './entities/custom-order-print-receipt.entity';
import { CustomOrdersService }    from './custom-orders.service';
import { CustomOrdersController } from './custom-orders.controller';
import { AuditModule }    from '../audit/audit.module';
import { StorageModule }  from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomOrder, CustomOrderItem, CustomOrderPayment, CustomOrderCommissionPayment, CustomOrderPrintReceipt]),
    AuditModule,
    StorageModule,
  ],
  controllers: [CustomOrdersController],
  providers:   [CustomOrdersService],
  exports:     [CustomOrdersService],
})
export class CustomOrdersModule {}
