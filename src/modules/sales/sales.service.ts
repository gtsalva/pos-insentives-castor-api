import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Sale, SaleStatus } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShiftClose, ShiftStatus } from '../shifts/entities/shift-close.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { GetSalesDto } from './dto/get-sales.dto';
import { PaginatedResult } from '../products/products.service';
import { AuditService } from '../audit/audit.service';

// Guatemala timezone: UTC-6, no daylight saving time
const GUATEMALA_UTC_OFFSET_HOURS = 6;

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ShiftClose)
    private readonly shiftCloseRepo: Repository<ShiftClose>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSaleDto, salesperson_id: string, salesperson_name: string): Promise<Sale> {
    const today = new Date(Date.now() - GUATEMALA_UTC_OFFSET_HOURS * 3600 * 1000).toISOString().slice(0, 10);
    const blocked = await this.shiftCloseRepo.findOne({
      where: { salesperson_id, shift_date: today, status: ShiftStatus.CLOSED },
      select: ['shift_close_id'],
    });
    if (blocked) {
      throw new ForbiddenException('Tu turno está cerrado. Contacta a un gerente para reabrirlo.');
    }

    const sale = await this.dataSource.transaction(async (manager) => {
      let total = 0;
      const saleItems: Partial<SaleItem>[] = [];

      for (const item of dto.items) {
        const product = await manager.findOne(Product, {
          where: { product_id: item.product_id, is_active: true },
        });
        if (!product) {
          throw new NotFoundException(`Producto ${item.product_id} no encontrado`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}: disponible ${product.stock}`,
          );
        }

        const subtotal = Number(product.unit_price) * item.quantity;
        total += subtotal;

        saleItems.push({
          product_id: product.product_id,
          product_sku: product.sku,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: Number(product.unit_price),
          subtotal,
        });

        await manager.decrement(
          Product,
          { product_id: product.product_id },
          'stock',
          item.quantity,
        );
      }

      const sale_number = await this.generateSaleNumber(manager);

      const newSale = manager.create(Sale, {
        sale_number,
        payment_method: dto.payment_method,
        salesperson_id,
        client_id: dto.client_id,
        payment_reference: dto.payment_reference ?? null,
        payment_document_url: dto.payment_document_url ?? null,
        payment_receipt_url: dto.payment_receipt_url ?? null,
        total,
        status: SaleStatus.COMPLETED,
      });

      const savedSale = await manager.save(Sale, newSale);

      const items = saleItems.map((i) =>
        manager.create(SaleItem, { ...i, sale_id: savedSale.sale_id }),
      );
      await manager.save(SaleItem, items);

      return manager.findOne(Sale, {
        where: { sale_id: savedSale.sale_id },
        relations: ['items', 'salesperson', 'client'],
      }) as Promise<Sale>;
    });

    this.auditService.log({
      action: 'SALE_CREATED',
      entity_type: 'Sale',
      entity_id: sale.sale_id,
      actor: { id: salesperson_id, name: salesperson_name },
      metadata: { total: sale.total, payment_method: sale.payment_method },
    });

    return sale;
  }

  async findAll(dto: GetSalesDto): Promise<PaginatedResult<Sale>> {
    const { page = 1, limit = 20, from_date, to_date, payment_method, status, salesperson_id } = dto;

    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.salesperson', 'u')
      .leftJoinAndSelect('s.items', 'i')
      .leftJoinAndSelect('s.client', 'c');

    if (from_date) qb.andWhere('s.created_at >= :from_date', { from_date });
    if (to_date) {
      const end = new Date(to_date);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('s.created_at <= :to_date', { to_date: end });
    }
    if (payment_method) qb.andWhere('s.payment_method = :payment_method', { payment_method });
    if (status) qb.andWhere('s.status = :status', { status });
    if (salesperson_id) qb.andWhere('s.salesperson_id = :salesperson_id', { salesperson_id });

    const [data, total] = await qb
      .orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(sale_id: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: { sale_id },
      relations: ['items', 'salesperson', 'client'],
    });
    if (!sale) throw new NotFoundException(`Venta ${sale_id} no encontrada`);
    return sale;
  }

  async voidSale(sale_id: string, dto: VoidSaleDto, actor: { id: string; name: string }): Promise<Sale> {
    const sale = await this.dataSource.transaction(async (manager) => {
      const foundSale = await manager.findOne(Sale, {
        where: { sale_id },
        relations: ['items'],
      });
      if (!foundSale) throw new NotFoundException(`Venta ${sale_id} no encontrada`);
      if (foundSale.status === SaleStatus.VOIDED) {
        throw new BadRequestException('La venta ya está anulada');
      }

      for (const item of foundSale.items) {
        await manager.increment(
          Product,
          { product_id: item.product_id },
          'stock',
          item.quantity,
        );
      }

      await manager.update(Sale, { sale_id }, {
        status: SaleStatus.VOIDED,
        void_reason: dto.void_reason,
      });

      return manager.findOne(Sale, {
        where: { sale_id },
        relations: ['items', 'salesperson', 'client'],
      }) as Promise<Sale>;
    });

    this.auditService.log({
      action: 'SALE_VOIDED',
      entity_type: 'Sale',
      entity_id: sale_id,
      actor,
      metadata: { void_reason: dto.void_reason },
    });

    return sale;
  }

  private async generateSaleNumber(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const count = await manager.count(Sale);
    return `VTA-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
