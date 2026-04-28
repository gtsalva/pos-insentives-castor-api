import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncentivePeriod } from './entities/incentive-period.entity';
import { IncentiveLiquidation } from './entities/incentive-liquidation.entity';
import { User } from '../users/entities/user.entity';
import { IncentivesRepository } from './incentives.repository';
import { IncentivesService } from './incentives.service';
import { IncentivesController } from './incentives.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IncentivePeriod, IncentiveLiquidation, User])],
  controllers: [IncentivesController],
  providers: [IncentivesRepository, IncentivesService],
})
export class IncentivesModule {}
