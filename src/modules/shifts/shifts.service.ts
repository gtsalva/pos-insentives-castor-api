import {
  Injectable, ConflictException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ShiftClose, ShiftStatus } from './entities/shift-close.entity';
import { Reconciliation } from './entities/reconciliation.entity';
import { Sale, SaleStatus, PaymentMethod } from '../sales/entities/sale.entity';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { AuditService, AuditActor } from '../audit/audit.service';

interface DailySummaryEntry {
  salesperson_id: string;
  salesperson_name: string | null;
  total_sales: number;
  transaction_count: number;
  cash_total: number;
  card_total: number;
  transfer_total: number;
  shift_close: ShiftClose | null;
  has_reconciliation: boolean;
}

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    @InjectRepository(ShiftClose)
    private readonly shiftCloseRepo: Repository<ShiftClose>,
    @InjectRepository(Reconciliation)
    private readonly reconciliationRepo: Repository<Reconciliation>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly auditService: AuditService,
  ) {}

  async close(dto: CloseShiftDto, actor: AuditActor, actorRole: string): Promise<ShiftClose> {
    const isAdmin = actorRole === 'ADMIN' || actorRole === 'MANAGER';
    const salesperson_id = isAdmin && dto.salesperson_id ? dto.salesperson_id : actor.id;
    const today = this.guatemalaToday();

    const existing = await this.shiftCloseRepo.findOne({ where: { salesperson_id, shift_date: today } });
    if (existing && existing.status === ShiftStatus.CLOSED) {
      throw new ConflictException('El turno de hoy ya está cerrado');
    }

    const [start, end] = this.guatemalaDayBounds(today);
    const todaySales = await this.saleRepo.find({
      where: {
        salesperson_id,
        status: SaleStatus.COMPLETED,
        created_at: Between(start, end),
      },
    });

    const totals = { cash: 0, card: 0, transfer: 0, total: 0 };
    for (const s of todaySales) {
      totals.total += Number(s.total);
      if (s.payment_method === PaymentMethod.CASH) totals.cash += Number(s.total);
      else if (s.payment_method === PaymentMethod.CARD) totals.card += Number(s.total);
      else if (s.payment_method === PaymentMethod.TRANSFER) totals.transfer += Number(s.total);
    }

    this.logger.log(`Shift closed for salesperson=${salesperson_id}, date=${today}, total=${totals.total}`);

    if (existing && existing.status === ShiftStatus.REOPENED) {
      existing.status = ShiftStatus.CLOSED;
      existing.total_sales = totals.total;
      existing.cash_total = totals.cash;
      existing.card_total = totals.card;
      existing.transfer_total = totals.transfer;
      existing.transaction_count = todaySales.length;
      existing.closed_by_id = actor.id;
      existing.notes = dto.notes ?? existing.notes;
      const saved = await this.shiftCloseRepo.save(existing);
      this.auditService.log({ action: 'SHIFT_CLOSED', entity_type: 'ShiftClose', entity_id: saved.shift_close_id, actor, metadata: { salesperson_id, shift_date: today, total_sales: totals.total } });
      return saved;
    }

    const shiftClose = this.shiftCloseRepo.create({
      salesperson_id,
      shift_date: today,
      status: ShiftStatus.CLOSED,
      total_sales: totals.total,
      cash_total: totals.cash,
      card_total: totals.card,
      transfer_total: totals.transfer,
      transaction_count: todaySales.length,
      closed_by_id: actor.id,
      notes: dto.notes ?? null,
      reopened_by_id: null,
      reopened_at: null,
    });

    const saved = await this.shiftCloseRepo.save(shiftClose);
    this.auditService.log({ action: 'SHIFT_CLOSED', entity_type: 'ShiftClose', entity_id: saved.shift_close_id, actor, metadata: { salesperson_id, shift_date: today, total_sales: totals.total } });
    return saved;
  }

  async reopen(shift_close_id: string, actor: AuditActor, notes?: string): Promise<ShiftClose> {
    const sc = await this.shiftCloseRepo.findOne({ where: { shift_close_id } });
    if (!sc) throw new NotFoundException(`Cierre ${shift_close_id} no encontrado`);
    if (sc.status === ShiftStatus.REOPENED) throw new ConflictException('El turno ya está reabierto');

    sc.status = ShiftStatus.REOPENED;
    sc.reopened_by_id = actor.id;
    sc.reopened_at = new Date();
    if (notes) sc.notes = notes;

    const saved = await this.shiftCloseRepo.save(sc);
    this.auditService.log({ action: 'SHIFT_REOPENED', entity_type: 'ShiftClose', entity_id: shift_close_id, actor, metadata: { salesperson_id: sc.salesperson_id } });
    return saved;
  }

  async getMyShiftToday(salesperson_id: string): Promise<ShiftClose | null> {
    const today = this.guatemalaToday();
    return this.shiftCloseRepo.findOne({
      where: { salesperson_id, shift_date: today },
      relations: ['salesperson', 'closed_by', 'reconciliation'],
    });
  }

  async dailySummary(date?: string): Promise<{ date: string; entries: DailySummaryEntry[] }> {
    const shift_date = date ?? this.guatemalaToday();
    const [start, end] = this.guatemalaDayBounds(shift_date);

    const salesAgg = await this.saleRepo
      .createQueryBuilder('s')
      .select('s.salesperson_id', 'salesperson_id')
      .addSelect('SUM(s.total)', 'total_sales')
      .addSelect('COUNT(s.sale_id)', 'transaction_count')
      .addSelect(`SUM(CASE WHEN s.payment_method = 'CASH' THEN s.total ELSE 0 END)`, 'cash_total')
      .addSelect(`SUM(CASE WHEN s.payment_method = 'CARD' THEN s.total ELSE 0 END)`, 'card_total')
      .addSelect(`SUM(CASE WHEN s.payment_method = 'TRANSFER' THEN s.total ELSE 0 END)`, 'transfer_total')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :start', { start })
      .andWhere('s.created_at <= :end', { end })
      .groupBy('s.salesperson_id')
      .getRawMany<{ salesperson_id: string; total_sales: string; transaction_count: string; cash_total: string; card_total: string; transfer_total: string }>();

    const shiftCloses = await this.shiftCloseRepo.find({
      where: { shift_date },
      relations: ['salesperson', 'reconciliation'],
    });

    const closeMap = new Map(shiftCloses.map((sc) => [sc.salesperson_id, sc]));
    const aggMap = new Map(salesAgg.map((a) => [a.salesperson_id, a]));
    const allIds = new Set([...closeMap.keys(), ...aggMap.keys()]);

    const entries: DailySummaryEntry[] = [];
    for (const salesperson_id of allIds) {
      const agg = aggMap.get(salesperson_id);
      const sc = closeMap.get(salesperson_id);
      entries.push({
        salesperson_id,
        salesperson_name: sc?.salesperson?.full_name ?? null,
        total_sales: agg ? parseFloat(agg.total_sales) : 0,
        transaction_count: agg ? parseInt(agg.transaction_count) : 0,
        cash_total: agg ? parseFloat(agg.cash_total) : 0,
        card_total: agg ? parseFloat(agg.card_total) : 0,
        transfer_total: agg ? parseFloat(agg.transfer_total) : 0,
        shift_close: sc ?? null,
        has_reconciliation: !!sc?.reconciliation,
      });
    }

    return { date: shift_date, entries };
  }

  async createReconciliation(shift_close_id: string, dto: CreateReconciliationDto, actor: AuditActor): Promise<Reconciliation> {
    const sc = await this.shiftCloseRepo.findOne({ where: { shift_close_id }, relations: ['reconciliation'] });
    if (!sc) throw new NotFoundException(`Cierre ${shift_close_id} no encontrado`);
    if (sc.reconciliation) throw new ConflictException('Este cierre ya tiene una conciliación');

    const recon = this.reconciliationRepo.create({
      shift_close_id,
      cash_expected: sc.cash_total,
      card_expected: sc.card_total,
      transfer_expected: sc.transfer_total,
      cash_counted: dto.cash_counted,
      card_counted: dto.card_counted,
      transfer_counted: dto.transfer_counted,
      other_counted: dto.other_counted,
      cash_difference: dto.cash_counted - sc.cash_total,
      card_difference: dto.card_counted - sc.card_total,
      transfer_difference: dto.transfer_counted - sc.transfer_total,
      reconciled_by_id: actor.id,
      notes: dto.notes ?? null,
    });

    const saved = await this.reconciliationRepo.save(recon);
    this.auditService.log({ action: 'RECONCILIATION_CREATED', entity_type: 'Reconciliation', entity_id: saved.reconciliation_id, actor, metadata: { shift_close_id, shift_date: sc.shift_date } });
    return saved;
  }

  async getReconciliation(shift_close_id: string): Promise<Reconciliation> {
    const recon = await this.reconciliationRepo.findOne({ where: { shift_close_id }, relations: ['reconciled_by'] });
    if (!recon) throw new NotFoundException(`Conciliación para cierre ${shift_close_id} no encontrada`);
    return recon;
  }

  async isShiftBlockedToday(salesperson_id: string): Promise<boolean> {
    const today = this.guatemalaToday();
    const sc = await this.shiftCloseRepo.findOne({
      where: { salesperson_id, shift_date: today, status: ShiftStatus.CLOSED },
      select: ['shift_close_id'],
    });
    return sc !== null;
  }

  private guatemalaToday(): string {
    return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
  }

  private guatemalaDayBounds(dateStr: string): [Date, Date] {
    const start = new Date(`${dateStr}T06:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return [start, end];
  }
}
