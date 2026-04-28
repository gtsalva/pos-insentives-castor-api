import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncentivePeriod } from './entities/incentive-period.entity';
import { IncentiveLiquidation } from './entities/incentive-liquidation.entity';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodQueryDto } from './dto/period-query.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

export interface SalespersonPerformance {
  salesperson_id: string;
  full_name: string;
  email: string;
  amount_sold: number;
  transaction_count: number;
  commission_earned: number;
  goal_pct: number;
  is_liquidated: boolean;
  liquidated_at: string | null;
}

export interface PeriodPerformanceResult {
  period: IncentivePeriod;
  performance: SalespersonPerformance[];
}

export interface MyPerformanceResult {
  period: IncentivePeriod | null;
  amount_sold: number;
  transaction_count: number;
  commission_earned: number;
  goal_pct: number;
  is_liquidated: boolean;
  liquidated_at: string | null;
}

@Injectable()
export class IncentivesService {
  constructor(
    @InjectRepository(IncentivePeriod)
    private readonly periodRepo: Repository<IncentivePeriod>,
    @InjectRepository(IncentiveLiquidation)
    private readonly liquidationRepo: Repository<IncentiveLiquidation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(query: PeriodQueryDto): Promise<IncentivePeriod[]> {
    const qb = this.periodRepo.createQueryBuilder('p').orderBy('p.start_date', 'DESC');
    if (query.is_active !== undefined) {
      qb.where('p.is_active = :is_active', { is_active: query.is_active });
    }
    return qb.getMany();
  }

  async findOne(period_id: string): Promise<IncentivePeriod> {
    const period = await this.periodRepo.findOne({ where: { period_id } });
    if (!period) throw new NotFoundException(`Período ${period_id} no encontrado`);
    return period;
  }

  async create(dto: CreatePeriodDto, created_by_id: string): Promise<IncentivePeriod> {
    const period = this.periodRepo.create({ ...dto, created_by_id });
    return this.periodRepo.save(period);
  }

  async update(period_id: string, dto: UpdatePeriodDto): Promise<IncentivePeriod> {
    const period = await this.findOne(period_id);
    Object.assign(period, dto);
    return this.periodRepo.save(period);
  }

  async getPeriodPerformance(period_id: string): Promise<PeriodPerformanceResult> {
    const period = await this.findOne(period_id);

    const salespeople = await this.userRepo.find({
      where: [{ role: Role.SALESPERSON }, { role: Role.CASHIER }],
      select: ['user_id', 'full_name', 'email', 'is_active'],
    });

    const salesAgg: { salesperson_id: string; total: string; count: string }[] =
      await this.periodRepo.manager.query(
        `
        SELECT s.salesperson_id,
               COALESCE(SUM(s.total), 0)::text AS total,
               COUNT(s.sale_id)::text           AS count
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND DATE(s.created_at) BETWEEN $1 AND $2
        GROUP BY s.salesperson_id
        `,
        [period.start_date, period.end_date],
      );

    const salesMap = new Map(salesAgg.map(r => [r.salesperson_id, r]));

    const liquidations = await this.liquidationRepo.find({
      where: { period_id },
    });
    const liqMap = new Map(liquidations.map(l => [l.salesperson_id, l]));

    const performance: SalespersonPerformance[] = salespeople
      .filter(u => u.is_active)
      .map(u => {
        const agg = salesMap.get(u.user_id);
        const amount_sold = agg ? parseFloat(agg.total) : 0;
        const transaction_count = agg ? parseInt(agg.count, 10) : 0;
        const commission_earned = parseFloat(
          (amount_sold * (period.commission_rate / 100)).toFixed(2),
        );
        const goal_pct = period.goal_amount > 0
          ? parseFloat(((amount_sold / period.goal_amount) * 100).toFixed(1))
          : 0;
        const liq = liqMap.get(u.user_id);
        return {
          salesperson_id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          amount_sold,
          transaction_count,
          commission_earned,
          goal_pct,
          is_liquidated: !!liq,
          liquidated_at: liq ? liq.created_at.toISOString() : null,
        };
      });

    return { period, performance };
  }

  async getMyPerformance(salesperson_id: string): Promise<MyPerformanceResult> {
    const period = await this.periodRepo.findOne({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });

    if (!period) {
      return {
        period: null, amount_sold: 0, transaction_count: 0,
        commission_earned: 0, goal_pct: 0, is_liquidated: false, liquidated_at: null,
      };
    }

    const [agg]: { total: string; count: string }[] =
      await this.periodRepo.manager.query(
        `
        SELECT COALESCE(SUM(s.total), 0)::text AS total,
               COUNT(s.sale_id)::text           AS count
        FROM sales s
        WHERE s.status = 'COMPLETED'
          AND s.salesperson_id = $1
          AND DATE(s.created_at) BETWEEN $2 AND $3
        `,
        [salesperson_id, period.start_date, period.end_date],
      );

    const amount_sold = parseFloat(agg.total);
    const transaction_count = parseInt(agg.count, 10);
    const commission_earned = parseFloat(
      (amount_sold * (period.commission_rate / 100)).toFixed(2),
    );
    const goal_pct = period.goal_amount > 0
      ? parseFloat(((amount_sold / period.goal_amount) * 100).toFixed(1))
      : 0;

    const liq = await this.liquidationRepo.findOne({
      where: { period_id: period.period_id, salesperson_id },
    });

    return {
      period, amount_sold, transaction_count, commission_earned, goal_pct,
      is_liquidated: !!liq,
      liquidated_at: liq ? liq.created_at.toISOString() : null,
    };
  }

  async liquidate(
    period_id: string,
    salesperson_id: string,
    liquidated_by_id: string,
  ): Promise<IncentiveLiquidation> {
    const existing = await this.liquidationRepo.findOne({
      where: { period_id, salesperson_id },
    });
    if (existing) throw new ConflictException('Este vendedor ya fue liquidado para este período');

    const { performance } = await this.getPeriodPerformance(period_id);
    const perf = performance.find(p => p.salesperson_id === salesperson_id);
    if (!perf) throw new NotFoundException(`Vendedor ${salesperson_id} no encontrado en este período`);

    const liquidation = this.liquidationRepo.create({
      period_id,
      salesperson_id,
      amount_sold: perf.amount_sold,
      commission_earned: perf.commission_earned,
      liquidated_by_id,
    });
    return this.liquidationRepo.save(liquidation);
  }
}
