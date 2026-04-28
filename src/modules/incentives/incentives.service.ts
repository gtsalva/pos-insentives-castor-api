import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IncentivePeriod } from './entities/incentive-period.entity';
import { IncentiveLiquidation } from './entities/incentive-liquidation.entity';
import { IncentivesRepository } from './incentives.repository';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodQueryDto } from './dto/period-query.dto';

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
    private readonly repo: IncentivesRepository,
    private readonly dataSource: DataSource,
  ) {}

  findAll(query: PeriodQueryDto): Promise<IncentivePeriod[]> {
    return this.repo.findAllPeriods(query);
  }

  async findOne(period_id: string): Promise<IncentivePeriod> {
    const period = await this.repo.findOnePeriod(period_id);
    if (!period) throw new NotFoundException(`Período ${period_id} no encontrado`);
    return period;
  }

  create(dto: CreatePeriodDto, created_by_id: string): Promise<IncentivePeriod> {
    return this.repo.createPeriod(dto, created_by_id);
  }

  async update(period_id: string, dto: UpdatePeriodDto): Promise<IncentivePeriod> {
    const period = await this.findOne(period_id);
    Object.assign(period, dto);
    return this.repo.savePeriod(period);
  }

  async getPeriodPerformance(period_id: string): Promise<PeriodPerformanceResult> {
    const period = await this.findOne(period_id);

    const [salespeople, salesAgg, liquidations] = await Promise.all([
      this.repo.findSalespeople(),
      this.repo.aggregateSalesForPeriod(period.start_date, period.end_date),
      this.repo.findLiquidationsForPeriod(period_id),
    ]);

    const salesMap = new Map(salesAgg.map(r => [r.salesperson_id, r]));
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
    const period = await this.repo.findActivePeriod();

    if (!period) {
      return {
        period: null, amount_sold: 0, transaction_count: 0,
        commission_earned: 0, goal_pct: 0, is_liquidated: false, liquidated_at: null,
      };
    }

    const [[agg], liq] = await Promise.all([
      this.repo.aggregateMySales(salesperson_id, period.start_date, period.end_date),
      this.repo.findLiquidation(period.period_id, salesperson_id),
    ]);

    const amount_sold = parseFloat(agg.total);
    const transaction_count = parseInt(agg.count, 10);
    const commission_earned = parseFloat(
      (amount_sold * (period.commission_rate / 100)).toFixed(2),
    );
    const goal_pct = period.goal_amount > 0
      ? parseFloat(((amount_sold / period.goal_amount) * 100).toFixed(1))
      : 0;

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
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(IncentiveLiquidation, {
        where: { period_id, salesperson_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) throw new ConflictException('Este vendedor ya fue liquidado para este período');

      const { performance } = await this.getPeriodPerformance(period_id);
      const perf = performance.find(p => p.salesperson_id === salesperson_id);
      if (!perf) throw new NotFoundException(`Vendedor ${salesperson_id} no encontrado en este período`);

      return manager.save(
        manager.create(IncentiveLiquidation, {
          period_id,
          salesperson_id,
          amount_sold: perf.amount_sold,
          commission_earned: perf.commission_earned,
          liquidated_by_id,
        }),
      );
    });
  }
}
