import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IncentivePeriod } from './entities/incentive-period.entity';
import { IncentiveLiquidation } from './entities/incentive-liquidation.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { CreatePeriodDto } from './dto/create-period.dto';
import { PeriodQueryDto } from './dto/period-query.dto';

@Injectable()
export class IncentivesRepository {
  constructor(
    @InjectRepository(IncentivePeriod)
    private readonly periodRepo: Repository<IncentivePeriod>,
    @InjectRepository(IncentiveLiquidation)
    private readonly liquidationRepo: Repository<IncentiveLiquidation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findAllPeriods(query: PeriodQueryDto): Promise<IncentivePeriod[]> {
    const qb = this.periodRepo.createQueryBuilder('p').orderBy('p.start_date', 'DESC');
    if (query.is_active !== undefined) {
      qb.where('p.is_active = :is_active', { is_active: query.is_active });
    }
    return qb.getMany();
  }

  findOnePeriod(period_id: string): Promise<IncentivePeriod | null> {
    return this.periodRepo.findOne({ where: { period_id } });
  }

  createPeriod(dto: CreatePeriodDto, created_by_id: string): Promise<IncentivePeriod> {
    const period = this.periodRepo.create({ ...dto, created_by_id });
    return this.periodRepo.save(period);
  }

  savePeriod(period: IncentivePeriod): Promise<IncentivePeriod> {
    return this.periodRepo.save(period);
  }

  findActivePeriod(): Promise<IncentivePeriod | null> {
    return this.periodRepo.findOne({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  findSalespeople(): Promise<Pick<User, 'user_id' | 'full_name' | 'email' | 'is_active'>[]> {
    return this.userRepo.find({
      where: [{ role: Role.SALESPERSON }, { role: Role.CASHIER }],
      select: ['user_id', 'full_name', 'email', 'is_active'],
    });
  }

  aggregateSalesForPeriod(
    start_date: string,
    end_date: string,
  ): Promise<{ salesperson_id: string; total: string; count: string }[]> {
    return this.dataSource.query(
      `
      SELECT salesperson_id,
             SUM(total)::text AS total,
             COUNT(*)::text   AS count
      FROM (
        SELECT s.salesperson_id, s.total
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND DATE(s.created_at) BETWEEN $1 AND $2

        UNION ALL

        SELECT co.salesperson_id, cop.amount AS total
        FROM custom_order_payments cop
        JOIN custom_orders co ON co.custom_order_id = cop.custom_order_id
        WHERE DATE(cop.created_at) BETWEEN $1 AND $2
      ) combined
      GROUP BY salesperson_id
      `,
      [start_date, end_date],
    );
  }

  aggregateMySales(
    salesperson_id: string,
    start_date: string,
    end_date: string,
  ): Promise<{ total: string; count: string }[]> {
    return this.dataSource.query(
      `
      SELECT SUM(total)::text AS total, COUNT(*)::text AS count
      FROM (
        SELECT s.total
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND s.salesperson_id = $1
          AND DATE(s.created_at) BETWEEN $2 AND $3

        UNION ALL

        SELECT cop.amount AS total
        FROM custom_order_payments cop
        JOIN custom_orders co ON co.custom_order_id = cop.custom_order_id
        WHERE co.salesperson_id = $1
          AND DATE(cop.created_at) BETWEEN $2 AND $3
      ) combined
      `,
      [salesperson_id, start_date, end_date],
    );
  }

  findLiquidationsForPeriod(period_id: string): Promise<IncentiveLiquidation[]> {
    return this.liquidationRepo.find({ where: { period_id } });
  }

  findLiquidation(period_id: string, salesperson_id: string): Promise<IncentiveLiquidation | null> {
    return this.liquidationRepo.findOne({ where: { period_id, salesperson_id } });
  }

  saveLiquidation(liquidation: Partial<IncentiveLiquidation>): Promise<IncentiveLiquidation> {
    return this.liquidationRepo.save(this.liquidationRepo.create(liquidation));
  }
}
