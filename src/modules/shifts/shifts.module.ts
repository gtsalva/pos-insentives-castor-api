import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftClose } from './entities/shift-close.entity';
import { Reconciliation } from './entities/reconciliation.entity';
import { Sale } from '../sales/entities/sale.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftClose, Reconciliation, Sale])],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
