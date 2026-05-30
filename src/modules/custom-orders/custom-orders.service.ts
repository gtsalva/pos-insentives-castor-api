import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomOrder }                    from './entities/custom-order.entity';
import { CustomOrderItem }               from './entities/custom-order-item.entity';
import { CustomOrderPayment }            from './entities/custom-order-payment.entity';
import { CustomOrderCommissionPayment }  from './entities/custom-order-commission-payment.entity';
import { CustomOrderStatus }             from './entities/custom-order-status.enum';
import { CreateCustomOrderDto }          from './dto/create-custom-order.dto';
import { UpdateCustomOrderDto }          from './dto/update-custom-order.dto';
import { RegisterPaymentDto }            from './dto/register-payment.dto';
import { RegisterCommissionPaymentDto }  from './dto/register-commission-payment.dto';
import { CustomOrderQueryDto }           from './dto/custom-order-query.dto';
import { AuditService, AuditActor } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

export interface PaginatedResult<T> { data: T[]; total: number; page: number; limit: number; }

const EDITABLE_STATUSES = [CustomOrderStatus.DRAFT, CustomOrderStatus.SENT];

@Injectable()
export class CustomOrdersService {
  constructor(
    @InjectRepository(CustomOrder)                   private readonly orderRepo:            Repository<CustomOrder>,
    @InjectRepository(CustomOrderItem)               private readonly itemRepo:             Repository<CustomOrderItem>,
    @InjectRepository(CustomOrderPayment)            private readonly paymentRepo:          Repository<CustomOrderPayment>,
    @InjectRepository(CustomOrderCommissionPayment)  private readonly commissionPaymentRepo: Repository<CustomOrderCommissionPayment>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(dto: CustomOrderQueryDto): Promise<PaginatedResult<CustomOrder>> {
    const { page = 1, limit = 20, status, salesperson_id, from_date, to_date, exclude_cancelled } = dto;
    const qb = this.orderRepo.createQueryBuilder('co')
      .leftJoinAndSelect('co.salesperson', 'salesperson')
      .leftJoinAndSelect('co.client', 'client')
      .orderBy('co.created_at', 'DESC');

    if (status)                  qb.andWhere('co.status = :status', { status });
    else if (exclude_cancelled)  qb.andWhere("co.status != 'CANCELLED'");
    if (salesperson_id)          qb.andWhere('co.salesperson_id = :salesperson_id', { salesperson_id });
    if (from_date)               qb.andWhere('DATE(co.created_at) >= :from_date', { from_date });
    if (to_date)                 qb.andWhere('DATE(co.created_at) <= :to_date', { to_date });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(custom_order_id: string): Promise<CustomOrder> {
    const order = await this.orderRepo.findOne({
      where: { custom_order_id },
      relations: [
        'salesperson', 'client', 'supplier',
        'items',
        'payments', 'payments.received_by',
        'commission_payments', 'commission_payments.paid_by',
        'print_receipts', 'print_receipts.printed_by',
      ],
    });
    if (!order) throw new NotFoundException(`Cotización ${custom_order_id} no encontrada`);
    return order;
  }

  async create(dto: CreateCustomOrderDto, actor: AuditActor): Promise<CustomOrder> {
    return this.dataSource.transaction(async (manager) => {
      const order_number = await this.generateOrderNumber(manager);
      const total = dto.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

      const order = manager.create(CustomOrder, {
        order_number,
        salesperson_id: actor.id,
        client_id:      dto.client_id    ?? null,
        client_name:    dto.client_name  ?? null,
        client_phone:   dto.client_phone ?? null,
        client_email:   dto.client_email ?? null,
        notes:                dto.notes                ?? null,
        client_notes:         dto.client_notes         ?? null,
        supplier_id:          dto.supplier_id          ?? null,
        delivery_date:        dto.delivery_date        ?? null,
        agreed_price:         dto.agreed_price         != null ? Math.round(dto.agreed_price * 100) / 100 : null,
        counts_for_incentive: dto.counts_for_incentive ?? true,
        total:                Math.round(total * 100) / 100,
        total_paid:           0,
      });
      const saved = await manager.save(CustomOrder, order);

      const items = dto.items.map(i => manager.create(CustomOrderItem, {
        custom_order_id: saved.custom_order_id,
        category_id:     i.category_id ?? null,
        description:     i.description,
        quantity:        i.quantity,
        unit_price:      i.unit_price,
        cost_price:      i.cost_price ?? null,
        notes:           i.notes     ?? null,
        subtotal:        Math.round(i.quantity * i.unit_price * 100) / 100,
      }));
      await manager.save(CustomOrderItem, items);

      this.auditService.log({
        action: 'CUSTOM_ORDER_CREATED', entity_type: 'CustomOrder',
        entity_id: saved.custom_order_id, actor,
        metadata: { order_number, total },
      });

      return manager.findOne(CustomOrder, {
        where: { custom_order_id: saved.custom_order_id },
        relations: ['salesperson', 'client', 'items'],
      }) as Promise<CustomOrder>;
    });
  }

  async update(custom_order_id: string, dto: UpdateCustomOrderDto, actor: AuditActor): Promise<CustomOrder> {
    const order = await this.findOne(custom_order_id);
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(`No se puede editar una cotización en estado ${order.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      if (dto.items) {
        await manager.delete(CustomOrderItem, { custom_order_id });
        const items = dto.items.map(i => manager.create(CustomOrderItem, {
          custom_order_id,
          description: i.description,
          quantity:    i.quantity,
          unit_price:  i.unit_price,
          cost_price:  i.cost_price ?? null,
          notes:       i.notes     ?? null,
          subtotal:    Math.round(i.quantity * i.unit_price * 100) / 100,
        }));
        await manager.save(CustomOrderItem, items);
        order.total = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
      }

      Object.assign(order, {
        client_id:           dto.client_id           ?? order.client_id,
        client_name:         dto.client_name         ?? order.client_name,
        client_phone:        dto.client_phone        ?? order.client_phone,
        client_email:        dto.client_email        ?? order.client_email,
        notes:               dto.notes               !== undefined ? dto.notes               : order.notes,
        client_notes:        dto.client_notes        !== undefined ? dto.client_notes        : order.client_notes,
        supplier_id:         dto.supplier_id         ?? order.supplier_id,
        delivery_date:       dto.delivery_date       ?? order.delivery_date,
        counts_for_incentive: dto.counts_for_incentive !== undefined ? dto.counts_for_incentive : order.counts_for_incentive,
        custom_commission:   dto.custom_commission   !== undefined ? (dto.custom_commission ?? null) : order.custom_commission,
      });

      await manager.save(CustomOrder, order);
      this.auditService.log({
        action: 'CUSTOM_ORDER_UPDATED', entity_type: 'CustomOrder',
        entity_id: custom_order_id, actor, metadata: { order_number: order.order_number },
      });

      return this.findOne(custom_order_id);
    });
  }

  async transition(custom_order_id: string, newStatus: CustomOrderStatus, actor: AuditActor, delivery_date?: string): Promise<CustomOrder> {
    const order = await this.findOne(custom_order_id);
    const allowed: Record<CustomOrderStatus, CustomOrderStatus[]> = {
      [CustomOrderStatus.DRAFT]:         [CustomOrderStatus.SENT, CustomOrderStatus.CANCELLED],
      [CustomOrderStatus.SENT]:          [CustomOrderStatus.APPROVED, CustomOrderStatus.CANCELLED],
      [CustomOrderStatus.APPROVED]:      [CustomOrderStatus.IN_PRODUCTION, CustomOrderStatus.CANCELLED],
      [CustomOrderStatus.IN_PRODUCTION]: [CustomOrderStatus.DELIVERED, CustomOrderStatus.CANCELLED],
      [CustomOrderStatus.DELIVERED]:     [CustomOrderStatus.COMPLETED],
      [CustomOrderStatus.COMPLETED]:     [],
      [CustomOrderStatus.CANCELLED]:     [],
    };

    if (!allowed[order.status].includes(newStatus)) {
      throw new BadRequestException(`No se puede pasar de ${order.status} a ${newStatus}`);
    }

    if (newStatus === CustomOrderStatus.APPROVED) {
      if (!delivery_date) throw new BadRequestException('Se requiere fecha de entrega al aprobar');
      order.delivery_date = delivery_date;
    }

    order.status = newStatus;
    await this.orderRepo.save(order);

    this.auditService.log({
      action: `CUSTOM_ORDER_${newStatus}`, entity_type: 'CustomOrder',
      entity_id: custom_order_id, actor, metadata: { order_number: order.order_number, newStatus },
    });

    return this.findOne(custom_order_id);
  }

  async registerPayment(custom_order_id: string, dto: RegisterPaymentDto, actor: AuditActor): Promise<CustomOrder> {
    const order = await this.findOne(custom_order_id);

    if (order.status === CustomOrderStatus.CANCELLED) {
      throw new BadRequestException('No se pueden registrar pagos en una orden cancelada');
    }

    const targetTotal  = order.agreed_price ?? order.total;
    const newTotalPaid = Math.round((order.total_paid + dto.amount) * 100) / 100;
    if (newTotalPaid > targetTotal + 0.01) {
      throw new BadRequestException(
        `El pago de Q ${dto.amount.toFixed(2)} excede el saldo pendiente de Q ${(targetTotal - order.total_paid).toFixed(2)}`
      );
    }

    const newStatus =
      newTotalPaid >= targetTotal - 0.01 && order.status === CustomOrderStatus.DELIVERED
        ? CustomOrderStatus.COMPLETED
        : order.status;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO custom_order_payments
           (custom_order_id, payment_method, amount, payment_reference, received_by_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [custom_order_id, dto.payment_method, dto.amount, dto.payment_reference ?? null, actor.id, dto.notes ?? null],
      );
      await manager.update(CustomOrder, { custom_order_id }, { total_paid: newTotalPaid, status: newStatus });
    });

    this.auditService.log({
      action: 'CUSTOM_ORDER_PAYMENT_RECEIVED', entity_type: 'CustomOrder',
      entity_id: custom_order_id, actor,
      metadata: { order_number: order.order_number, amount: dto.amount, payment_method: dto.payment_method },
    });

    return this.findOne(custom_order_id);
  }

  async updateDeliveryDate(custom_order_id: string, delivery_date: string, actor: AuditActor): Promise<CustomOrder> {
    const order = await this.findOne(custom_order_id);
    const editableDelivery = [
      CustomOrderStatus.APPROVED, CustomOrderStatus.IN_PRODUCTION, CustomOrderStatus.DELIVERED,
    ];
    if (!editableDelivery.includes(order.status)) {
      throw new BadRequestException('Solo se puede cambiar la fecha de entrega en órdenes aprobadas o en producción');
    }
    order.delivery_date = delivery_date;
    await this.orderRepo.save(order);
    this.auditService.log({
      action: 'CUSTOM_ORDER_DELIVERY_DATE_CHANGED', entity_type: 'CustomOrder',
      entity_id: custom_order_id, actor, metadata: { order_number: order.order_number, delivery_date },
    });
    return this.findOne(custom_order_id);
  }

  async registerCommissionPayment(custom_order_id: string, dto: RegisterCommissionPaymentDto, actor: AuditActor): Promise<CustomOrder> {
    await this.findOne(custom_order_id);
    await this.dataSource.query(
      `INSERT INTO custom_order_commission_payments
         (custom_order_id, amount, notes, paid_by_id)
       VALUES ($1, $2, $3, $4)`,
      [custom_order_id, dto.amount, dto.notes ?? null, actor.id],
    );
    this.auditService.log({
      action: 'CUSTOM_ORDER_COMMISSION_PAID', entity_type: 'CustomOrder',
      entity_id: custom_order_id, actor, metadata: { amount: dto.amount },
    });
    return this.findOne(custom_order_id);
  }

  async registerPrintReceipt(custom_order_id: string, actor: AuditActor, file?: Express.Multer.File): Promise<CustomOrder> {
    const order = await this.findOne(custom_order_id);
    const pdf_url = file ? await this.storageService.uploadFile(file, 'print-receipts') : null;
    await this.dataSource.query(
      `INSERT INTO custom_order_print_receipts (custom_order_id, printed_by_id, pdf_url) VALUES ($1, $2, $3)`,
      [custom_order_id, actor.id, pdf_url],
    );
    this.auditService.log({
      action: 'CUSTOM_ORDER_PRINT_RECEIPT', entity_type: 'CustomOrder',
      entity_id: custom_order_id, actor,
      metadata: { order_number: order.order_number },
    });
    return this.findOne(custom_order_id);
  }

  private async generateOrderNumber(manager: import('typeorm').EntityManager): Promise<string> {
    const count = await manager.count(CustomOrder);
    return `COT-${String(count + 1).padStart(5, '0')}`;
  }
}
