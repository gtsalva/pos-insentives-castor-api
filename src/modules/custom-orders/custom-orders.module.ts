import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { CustomOrder }        from './entities/custom-order.entity';
import { CustomOrderItem }    from './entities/custom-order-item.entity';
import { CustomOrderPayment } from './entities/custom-order-payment.entity';
import { CustomOrdersService }    from './custom-orders.service';
import { CustomOrdersController } from './custom-orders.controller';
import { AuditModule }  from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomOrder, CustomOrderItem, CustomOrderPayment]),
    AuditModule,
  ],
  controllers: [CustomOrdersController],
  providers:   [CustomOrdersService],
  exports:     [CustomOrdersService],
})
export class CustomOrdersModule {}
